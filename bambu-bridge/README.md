# PrintOS — Bambu A1 Bridge

Connects your Bambu A1 to PrintOS via local MQTT, pushing live print status to the Kanban board.

## Setup

### 1. Enable Developer Mode on your printer

On the printer touchscreen:
- Settings → Network → Developer Mode → **ON**
- Note the **IP Address** and **Access Code** shown on that screen

### 2. Configure the bridge

```bash
cp config.example.json config.json
```

Edit `config.json`:
```json
{
  "printerIp": "192.168.1.XXX",     ← your printer's IP
  "accessCode": "12345678",          ← 8-digit code from printer screen
  "serialNumber": "01S00C123456789", ← serial from printer screen
  "printerName": "Bambu A1",
  "convexUrl": "https://cheery-cod-872.convex.cloud"
}
```

### 3. Install and run

```bash
npm install
npm start
```

You should see:
```
✅  Connected to Bambu A1 MQTT broker
📡  Subscribed to device/XXXXX/report
📊  RUNNING | 42% | 87min left | 220°C nozzle
```

### 4. Keep it running

Run the bridge whenever you want live status in PrintOS. You can minimize the terminal — it reconnects automatically if the printer goes offline.

## What it shows in PrintOS

When a job is in the **Printing** stage on the Kanban board, the card will show:
- Live progress % from the printer (not estimated)
- Actual time remaining
- Nozzle and bed temperature
- Current layer / total layers

## Troubleshooting

**"Connection refused"** — Make sure Developer Mode is ON on the printer.

**"Not authorized"** — Double-check the access code. It's the 8-digit code, not your Bambu account password.

**Progress not updating** — The bridge only pushes when values change. If the printer is idle, no updates are sent.
