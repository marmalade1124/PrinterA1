/**
 * PrintOS — Bambu A1 Local MQTT Bridge
 *
 * Connects to your Bambu A1 on your local network and pushes
 * live print status to your PrintOS Convex backend.
 *
 * Setup:
 *   1. Enable Developer Mode on your printer:
 *      Printer touchscreen → Settings → Network → Developer Mode → ON
 *   2. Note your printer's IP address and LAN access code from the same screen
 *   3. Copy config.example.json to config.json and fill in your values
 *   4. Run: npm install && npm start
 */

import mqtt from 'mqtt'
import { readFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { join, dirname } from 'path'

// ─── Load config ─────────────────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const configPath = join(__dirname, 'config.json')
if (!existsSync(configPath)) {
  console.error('❌  config.json not found.')
  console.error('    Copy config.example.json to config.json and fill in your values.')
  process.exit(1)
}

const config = JSON.parse(readFileSync(configPath, 'utf8'))
const { printerIp, accessCode, serialNumber, convexUrl, printerName } = config

if (!printerIp || !accessCode || !serialNumber || !convexUrl) {
  console.error('❌  config.json is missing required fields.')
  console.error('    Required: printerIp, accessCode, serialNumber, convexUrl')
  process.exit(1)
}

// ─── MQTT connection ──────────────────────────────────────────────────────────

const TOPIC_REPORT = `device/${serialNumber}/report`
const TOPIC_REQUEST = `device/${serialNumber}/request`

console.log(`🖨️  PrintOS Bambu Bridge starting...`)
console.log(`    Printer: ${printerName ?? 'Bambu A1'} @ ${printerIp}`)
console.log(`    Serial:  ${serialNumber}`)
console.log(`    Convex:  ${convexUrl}`)

const client = mqtt.connect(`mqtts://${printerIp}:8883`, {
  username: 'bblp',
  password: accessCode,
  rejectUnauthorized: false, // Bambu uses self-signed cert
  reconnectPeriod: 5000,
  connectTimeout: 10000,
})

// ─── State tracking ───────────────────────────────────────────────────────────

let printerState = {
  gcode_state: 'IDLE',
  mc_percent: 0,
  mc_remaining_time: 0,
  gcode_file: '',
  nozzle_temper: 0,
  bed_temper: 0,
  layer_num: 0,
  total_layer_num: 0,
}

let pushInterval = null
let lastPushHash = ''

// ─── MQTT events ─────────────────────────────────────────────────────────────

client.on('connect', () => {
  console.log('✅  Connected to Bambu A1 MQTT broker')
  client.subscribe(TOPIC_REPORT, (err) => {
    if (err) {
      console.error('❌  Failed to subscribe:', err.message)
    } else {
      console.log(`📡  Subscribed to ${TOPIC_REPORT}`)
      // Request full status immediately
      requestFullStatus()
    }
  })
})

client.on('reconnect', () => {
  console.log('🔄  Reconnecting to printer...')
})

client.on('error', (err) => {
  console.error('❌  MQTT error:', err.message)
})

client.on('offline', () => {
  console.log('⚠️   Printer went offline')
  pushStatus({ gcode_state: 'OFFLINE' })
})

client.on('message', (topic, payload) => {
  try {
    const msg = JSON.parse(payload.toString())
    if (msg.print) {
      handlePrintReport(msg.print)
    }
  } catch {
    // Ignore non-JSON messages
  }
})

// ─── Status handling ──────────────────────────────────────────────────────────

function handlePrintReport(print) {
  // Merge partial updates into state
  const fields = [
    'gcode_state', 'mc_percent', 'mc_remaining_time',
    'gcode_file', 'nozzle_temper', 'bed_temper',
    'layer_num', 'total_layer_num',
  ]
  let changed = false
  for (const field of fields) {
    if (print[field] !== undefined && print[field] !== printerState[field]) {
      printerState[field] = print[field]
      changed = true
    }
  }

  if (changed) {
    const hash = JSON.stringify(printerState)
    if (hash !== lastPushHash) {
      lastPushHash = hash
      pushStatus(printerState)
    }
  }
}

function requestFullStatus() {
  const request = JSON.stringify({
    pushing: {
      sequence_id: '0',
      command: 'pushall',
      version: 1,
      push_target: 1,
    }
  })
  client.publish(TOPIC_REQUEST, request)
}

// ─── Push to Convex ───────────────────────────────────────────────────────────

async function pushStatus(state) {
  const status = {
    printerName: printerName ?? 'Bambu A1',
    serialNumber,
    gcodeState: state.gcode_state ?? 'UNKNOWN',
    progressPercent: state.mc_percent ?? 0,
    remainingMinutes: state.mc_remaining_time ?? 0,
    gcodeFile: state.gcode_file ?? '',
    nozzleTemp: state.nozzle_temper ?? 0,
    bedTemp: state.bed_temper ?? 0,
    layerNum: state.layer_num ?? 0,
    totalLayers: state.total_layer_num ?? 0,
    updatedAt: Date.now(),
  }

  const stateLabel = status.gcodeState
  const progress = status.progressPercent
  const remaining = status.remainingMinutes

  console.log(`📊  ${stateLabel} | ${progress}% | ${remaining}min left | ${status.nozzleTemp}°C nozzle`)

  try {
    const response = await fetch(`${convexUrl}/api/mutation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: 'printerStatus:upsert',
        args: status,
        format: 'json',
      }),
    })

    if (!response.ok) {
      const text = await response.text()
      console.error('❌  Convex push failed:', response.status, text)
    }
  } catch (err) {
    console.error('❌  Failed to push to Convex:', err.message)
  }
}

// ─── Poll for full status every 30s ──────────────────────────────────────────

pushInterval = setInterval(() => {
  if (client.connected) {
    requestFullStatus()
  }
}, 30000)

// ─── Graceful shutdown ────────────────────────────────────────────────────────

process.on('SIGINT', () => {
  console.log('\n👋  Shutting down bridge...')
  clearInterval(pushInterval)
  client.end()
  process.exit(0)
})
