import React, { useState, useEffect } from 'react'
import { GlassCard } from '../ui/GlassCard'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { ProgressBar } from '../ui/ProgressBar'
import { JobStage, STAGE_ORDER } from '../../types/index'

interface JobCardJob {
  _id: string
  jobNumber: string
  clientName: string
  materialId: string
  layerHeight: number
  printerId: string
  stage: JobStage
  estimatedPrintTime: number
  estimatedVolumeCm3: number
  startedPrintingAt?: number
  quotedPrice?: number
}

export interface LivePrinterStatus {
  gcodeState: string       // IDLE | RUNNING | PAUSE | FINISH | FAILED | OFFLINE
  progressPercent: number
  remainingMinutes: number
  nozzleTemp: number
  bedTemp: number
  layerNum: number
  totalLayers: number
  updatedAt: number
}

export interface JobCardProps {
  job: JobCardJob
  materialName?: string
  printerName?: string
  liveStatus?: LivePrinterStatus | null
  onAdvance: (jobId: string, confirmed?: boolean) => void
  onMoveBack: (jobId: string, targetStage: JobStage) => void
  onEdit: (jobId: string) => void
}

const STAGE_ACCENT: Record<JobStage, string> = {
  'Pending': 'bg-outline',
  'Slicing': 'bg-primary',
  'Printing': 'bg-tertiary-container',
  'Post-Processing': 'bg-outline-variant',
  'Ready for Pickup': 'bg-green-500',
}

function formatMinutes(minutes: number): string {
  if (minutes < 60) return Math.round(minutes) + 'm'
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  return m > 0 ? h + 'h ' + m + 'm' : h + 'h'
}

function useTick(enabled: boolean, intervalMs = 30000) {
  const [, setTick] = useState(0)
  useEffect(() => {
    if (!enabled) return
    const id = setInterval(() => setTick(t => t + 1), intervalMs)
    return () => clearInterval(id)
  }, [enabled, intervalMs])
}

export function JobCard({ job, materialName, printerName, liveStatus, onAdvance, onMoveBack, onEdit }: JobCardProps) {
  const [showMenu, setShowMenu] = useState(false)

  const isLastStage = job.stage === 'Ready for Pickup'
  const isPrinting = job.stage === 'Printing'

  // Use live data from Bambu bridge if available, otherwise fall back to estimate
  const hasLiveData = isPrinting && liveStatus && liveStatus.gcodeState === 'RUNNING'
  useTick(isPrinting && !hasLiveData) // only tick for estimated progress

  const progressPercent = hasLiveData
    ? liveStatus.progressPercent
    : isPrinting && job.startedPrintingAt
      ? Math.min(100, Math.round(((Date.now() - job.startedPrintingAt) / 60000 / job.estimatedPrintTime) * 100))
      : 0

  const remainingMinutes = hasLiveData
    ? liveStatus.remainingMinutes
    : Math.max(0, job.estimatedPrintTime - (isPrinting && job.startedPrintingAt ? (Date.now() - job.startedPrintingAt) / 60000 : 0))

  const stageIndex = STAGE_ORDER.indexOf(job.stage)
  const previousStages = STAGE_ORDER.slice(0, stageIndex)

  // Check if live data is stale (> 2 minutes old)
  const isLiveStale = liveStatus && (Date.now() - liveStatus.updatedAt) > 120000

  return (
    <GlassCard className="rounded-[16px] p-4 flex flex-col gap-3 relative overflow-hidden">
      {/* Left accent bar */}
      <div className={`absolute top-0 left-0 w-1 h-full ${STAGE_ACCENT[job.stage]}`} aria-hidden="true" />

      {/* Top row */}
      <div className="flex items-center justify-between pl-2">
        <span className="text-label-sm text-on-surface-variant font-mono">{job.jobNumber}</span>
        <div className="relative">
          <button
            type="button"
            aria-label="More options"
            aria-expanded={showMenu}
            aria-haspopup="menu"
            onClick={() => setShowMenu(v => !v)}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-white/5 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">more_horiz</span>
          </button>
          {showMenu && (
            <div role="menu" className="absolute right-0 top-9 z-20 glass-panel rounded-xl py-1 min-w-[180px] shadow-lg">
              {/* Edit option — always available */}
              <button
                role="menuitem"
                type="button"
                onClick={() => { setShowMenu(false); onEdit(job._id) }}
                className="w-full text-left px-3 py-2 text-label-md text-primary hover:bg-white/5 transition-colors flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[14px]" aria-hidden="true">edit</span>
                Edit job
              </button>
              {previousStages.length > 0 && (
                <>
                  <div className="border-t border-white/10 my-1" />
                  <p className="text-label-sm text-on-surface-variant px-3 py-1.5">Move back to:</p>
                  {previousStages.map(stage => (
                    <button
                      key={stage}
                      role="menuitem"
                      type="button"
                      onClick={() => { setShowMenu(false); onMoveBack(job._id, stage) }}
                      className="w-full text-left px-3 py-2 text-label-md text-on-surface hover:bg-white/5 transition-colors"
                    >
                      {stage}
                    </button>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Middle row */}
      <div className="flex items-start gap-3 pl-2">
        <div className="w-12 h-12 rounded-lg bg-surface-container-lowest flex items-center justify-center flex-shrink-0" aria-hidden="true">
          <span className="material-symbols-outlined text-[20px] text-on-surface-variant">layers</span>
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-body-md text-on-surface font-medium truncate">{job.clientName}</span>
          {printerName && <span className="text-label-sm text-on-surface-variant truncate">{printerName}</span>}
        </div>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5 pl-2">
        {materialName && <Badge variant="status">{materialName}</Badge>}
        <Badge variant="status">{job.layerHeight} mm</Badge>
        <Badge variant="status">
          <span className="material-symbols-outlined text-[12px] mr-0.5" aria-hidden="true">schedule</span>
          {formatMinutes(job.estimatedPrintTime)}
        </Badge>
      </div>

      {/* Printing progress */}
      {isPrinting && (
        <div className="pl-2 flex flex-col gap-2">
          <div className="flex items-center justify-between text-label-sm text-on-surface-variant">
            <span className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tertiary-container opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-tertiary-container" />
              </span>
              {hasLiveData ? 'Live' : 'Printing'}
              {isLiveStale && <span className="text-outline">(stale)</span>}
            </span>
            <span>{formatMinutes(remainingMinutes)} left</span>
          </div>
          <ProgressBar value={progressPercent} label={progressPercent + '% complete'} colorClass="bg-tertiary-container" />

          {/* Live Bambu stats */}
          {hasLiveData && !isLiveStale && (
            <div className="flex items-center gap-3 mt-1">
              <span className="text-label-sm text-on-surface-variant flex items-center gap-1">
                <span className="material-symbols-outlined text-[12px]" aria-hidden="true">thermostat</span>
                {liveStatus.nozzleTemp}°C
              </span>
              <span className="text-label-sm text-on-surface-variant flex items-center gap-1">
                <span className="material-symbols-outlined text-[12px]" aria-hidden="true">bed</span>
                {liveStatus.bedTemp}°C
              </span>
              {liveStatus.totalLayers > 0 && (
                <span className="text-label-sm text-on-surface-variant">
                  Layer {liveStatus.layerNum}/{liveStatus.totalLayers}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Advance button */}
      <div className="pl-2">
        {isLastStage ? (
          <Button variant="secondary" disabled icon="check_circle" className="w-full">
            Ready for Pickup
          </Button>
        ) : (
          <Button variant="primary" onClick={() => onAdvance(job._id)} className="w-full" icon="arrow_forward">
            Advance
          </Button>
        )}
      </div>
    </GlassCard>
  )
}
