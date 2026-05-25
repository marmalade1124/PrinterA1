import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { KanbanBoard } from '../components/jobs/KanbanBoard'
import { NewJobForm } from '../components/jobs/NewJobForm'
import { Modal } from '../components/ui/Modal'
import { Button } from '../components/ui/Button'
import { useToast } from '../components/ui/Toast'
import { JobStage } from '../types/index'
import { advanceStageLogic, isBackwardTransition } from '../lib/stageTransitions'
import { NewJobInputs } from '../lib/jobCreation'
import type { Id } from '../../convex/_generated/dataModel'
import type { LivePrinterStatus } from '../components/jobs/JobCard'

interface ConfirmModal {
  type: 'backward' | 'insufficient_stock'
  jobId: Id<'jobs'>
  targetStage?: JobStage
  message: string
}

export default function JobQueuePage() {
  const jobs = useQuery(api.jobs.listAll) ?? []
  const materials = useQuery(api.materials.listAll) ?? []
  const printers = useQuery(api.printers.listAll) ?? []
  const rawPrinterStatuses = useQuery(api.printerStatus.listAll) ?? []

  const createJob = useMutation(api.jobs.create)
  const advanceStage = useMutation(api.jobs.advanceStage)

  // Build a map of printerId → live status for fast lookup
  // We match by printerName since the bridge uses name, not Convex ID
  const printerStatusMap: Record<string, LivePrinterStatus> = {}
  for (const status of rawPrinterStatuses) {
    const matchedPrinter = printers.find(p => p.name === status.printerName)
    if (matchedPrinter) {
      printerStatusMap[matchedPrinter._id as string] = {
        gcodeState: status.gcodeState,
        progressPercent: status.progressPercent,
        remainingMinutes: status.remainingMinutes,
        nozzleTemp: status.nozzleTemp,
        bedTemp: status.bedTemp,
        layerNum: status.layerNum,
        totalLayers: status.totalLayers,
        updatedAt: status.updatedAt,
      }
    }
  }

  const { showToast } = useToast()

  const [searchQuery, setSearchQuery] = useState('')
  const [isNewJobOpen, setIsNewJobOpen] = useState(false)
  const [confirmModal, setConfirmModal] = useState<ConfirmModal | null>(null)
  const [isConfirming, setIsConfirming] = useState(false)

  const filteredJobs = searchQuery.trim()
    ? jobs.filter(
        j =>
          j.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          j.jobNumber.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : jobs

  async function handleAdvance(jobId: string, confirmed?: boolean) {
    const job = jobs.find(j => j._id === jobId)
    if (!job) return
    if (job.stage === 'Ready for Pickup') return

    try {
      const nextStage = advanceStageLogic(job.stage as JobStage)

      if (isBackwardTransition(job.stage as JobStage, nextStage) && !confirmed) {
        setConfirmModal({
          type: 'backward',
          jobId: jobId as Id<'jobs'>,
          targetStage: nextStage,
          message: `Moving from "${job.stage}" to "${nextStage}" is a backward transition. Are you sure?`,
        })
        return
      }

      await advanceStage({ jobId: jobId as Id<'jobs'> })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('INSUFFICIENT_STOCK')) {
        setConfirmModal({
          type: 'insufficient_stock',
          jobId: jobId as Id<'jobs'>,
          message: 'This job would deduct more material than currently in stock. Proceed anyway?',
        })
      } else if (msg.includes('ALREADY_AT_FINAL_STAGE')) {
        // silently ignore
      } else {
        showToast(`Failed to advance job: ${msg}`, 'error')
      }
    }
  }

  function handleMoveBack(jobId: string, targetStage: JobStage) {
    const job = jobs.find(j => j._id === jobId)
    if (!job) return
    setConfirmModal({
      type: 'backward',
      jobId: jobId as Id<'jobs'>,
      targetStage,
      message: `Move "${job.clientName}" (${job.jobNumber}) back to "${targetStage}"? This is a backward transition.`,
    })
  }

  async function handleConfirm() {
    if (!confirmModal) return
    setIsConfirming(true)
    try {
      const { jobId, targetStage, type } = confirmModal
      if (type === 'backward' && targetStage) {
        await advanceStage({ jobId, targetStage, confirmed: true })
      } else if (type === 'insufficient_stock') {
        await advanceStage({ jobId, force: true })
      }
      setConfirmModal(null)
    } catch (err: unknown) {
      showToast(`Operation failed: ${err instanceof Error ? err.message : String(err)}`, 'error')
    } finally {
      setIsConfirming(false)
    }
  }

  async function handleNewJobSubmit(data: NewJobInputs & { estimatedVolumeCm3: number }) {
    await createJob({
      clientName: data.clientName,
      materialId: data.materialId as Id<'materials'>,
      layerHeight: data.layerHeight,
      printerId: data.printerId as Id<'printers'>,
      estimatedPrintTime: data.estimatedPrintTime,
      estimatedVolumeCm3: data.estimatedVolumeCm3,
    })
    showToast('Job created successfully.', 'success')
  }

  // Shape data for KanbanBoard (uses string _id)
  const boardJobs = filteredJobs.map(j => ({
    _id: j._id as string,
    jobNumber: j.jobNumber,
    clientName: j.clientName,
    materialId: j.materialId as string,
    layerHeight: j.layerHeight,
    printerId: j.printerId as string,
    stage: j.stage as JobStage,
    estimatedPrintTime: j.estimatedPrintTime,
    estimatedVolumeCm3: j.estimatedVolumeCm3,
    startedPrintingAt: j.startedPrintingAt,
    quotedPrice: j.quotedPrice,
  }))

  const boardMaterials = materials.map(m => ({ _id: m._id as string, name: m.name, type: m.type }))
  const boardPrinters = printers.map(p => ({ _id: p._id as string, name: p.name }))
  const formMaterials = materials.map(m => ({ _id: m._id as string, name: m.name, type: m.type }))
  const formPrinters = printers.map(p => ({ _id: p._id as string, name: p.name }))

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Page header */}
      <div className="flex-shrink-0 px-8 pt-6 pb-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-headline-lg text-on-surface font-semibold">Job Queue</h1>
            <p className="text-body-md text-on-surface-variant mt-0.5">
              Manage and track all active print jobs across stages.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant pointer-events-none" aria-hidden="true">search</span>
              <input
                type="search"
                placeholder="Search jobs…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                aria-label="Search jobs"
                className="pl-9 pr-3 py-2 rounded-lg bg-surface-container border border-outline-variant text-on-surface text-body-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors w-48 md:w-64"
              />
            </div>
            <button
              type="button"
              aria-label="Filter jobs"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg bg-surface-container border border-outline-variant text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors px-3 gap-2"
            >
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">filter_list</span>
              <span className="text-label-md hidden md:inline">Filter</span>
            </button>
            <Button variant="primary" icon="add" onClick={() => setIsNewJobOpen(true)}>
              New Print Job
            </Button>
          </div>
        </div>
      </div>

      {/* Kanban board — fills remaining height, scrolls horizontally */}
      <div className="flex-1 min-h-0">
        <KanbanBoard
          jobs={boardJobs}
          materials={boardMaterials}
          printers={boardPrinters}
          printerStatuses={printerStatusMap}
          onAdvance={handleAdvance}
          onMoveBack={handleMoveBack}
        />
      </div>

      {/* New Job Form modal */}
      <NewJobForm
        isOpen={isNewJobOpen}
        onClose={() => setIsNewJobOpen(false)}
        materials={formMaterials}
        printers={formPrinters}
        onSubmit={handleNewJobSubmit}
      />

      {/* Confirmation modal */}
      {confirmModal && (
        <Modal
          isOpen={!!confirmModal}
          onClose={() => setConfirmModal(null)}
          title={confirmModal.type === 'insufficient_stock' ? 'Insufficient Stock' : 'Confirm Stage Change'}
          confirmLabel={confirmModal.type === 'insufficient_stock' ? 'Proceed Anyway' : 'Confirm'}
          confirmVariant={confirmModal.type === 'insufficient_stock' ? 'secondary' : 'primary'}
          onConfirm={handleConfirm}
          isLoading={isConfirming}
        >
          <p className="text-body-md text-on-surface-variant">{confirmModal.message}</p>
          {confirmModal.type === 'insufficient_stock' && (
            <p className="text-label-sm text-error mt-2">
              Warning: Proceeding will deduct more stock than currently available.
            </p>
          )}
        </Modal>
      )}
    </div>
  )
}
