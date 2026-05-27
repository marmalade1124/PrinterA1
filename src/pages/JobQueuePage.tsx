import { useState, useEffect } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { useLocation } from 'react-router-dom'
import { api } from '../../convex/_generated/api'
import { KanbanBoard } from '../components/jobs/KanbanBoard'
import { NewJobForm } from '../components/jobs/NewJobForm'
import { Modal } from '../components/ui/Modal'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { useToast } from '../components/ui/Toast'
import { JobStage, STAGE_ORDER } from '../types/index'
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

interface EditJobData {
  jobId: string
  clientName: string
  quotedPrice: string
  materialUsed: string
  materialType: 'filament' | 'resin'
  estimatedPrintTime: string
  estimatedVolumeCm3: string
}

const ALL_STAGES = 'All Stages'
const FILTER_OPTIONS = [ALL_STAGES, ...STAGE_ORDER] as const

export default function JobQueuePage() {
  const jobs = useQuery(api.jobs.listAll) ?? []
  const materials = useQuery(api.materials.listAll) ?? []
  const printers = useQuery(api.printers.listAll) ?? []
  const rawPrinterStatuses = useQuery(api.printerStatus.listAll) ?? []

  const createJob = useMutation(api.jobs.create)
  const advanceStage = useMutation(api.jobs.advanceStage)
  const updateJob = useMutation(api.jobs.updateJob)

  const location = useLocation()

  // Build a map of printerId → live status for fast lookup
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
  const [stageFilter, setStageFilter] = useState<string>(ALL_STAGES)
  const [showFilterDropdown, setShowFilterDropdown] = useState(false)
  const [isNewJobOpen, setIsNewJobOpen] = useState(false)
  const [newJobPrefill, setNewJobPrefill] = useState<NewJobFormProps['prefill']>(undefined)
  const [confirmModal, setConfirmModal] = useState<ConfirmModal | null>(null)
  const [isConfirming, setIsConfirming] = useState(false)
  const [editJobData, setEditJobData] = useState<EditJobData | null>(null)
  const [isEditSubmitting, setIsEditSubmitting] = useState(false)

  // Fix 6: Check location.state for prefill data from Pricing Engine
  useEffect(() => {
    const state = location.state as Record<string, unknown> | null
    if (state?.prefillJob) {
      const prefill = state.prefillJob as NewJobFormProps['prefill']
      setNewJobPrefill(prefill)
      setIsNewJobOpen(true)
      // Clear state so re-navigating doesn't re-open
      window.history.replaceState({}, '')
    }
  }, [location.state])

  const filteredJobs = jobs.filter(j => {
    const matchesSearch = !searchQuery.trim() ||
      j.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      j.jobNumber.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStage = stageFilter === ALL_STAGES || j.stage === stageFilter
    return matchesSearch && matchesStage
  })

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

  function handleEditJob(jobId: string) {
    const job = jobs.find(j => j._id === jobId)
    if (!job) return
    const mat = materials.find(m => m._id === (job.materialId as string))
    const materialType = mat?.type ?? 'filament'
    const materialUsed = materialType === 'resin'
      ? String(job.materialUsedMl ?? '')
      : String(job.materialUsedGrams ?? '')
    setEditJobData({
      jobId: job._id as string,
      clientName: job.clientName,
      quotedPrice: job.quotedPrice != null ? String(job.quotedPrice) : '',
      materialUsed,
      materialType,
      estimatedPrintTime: String(job.estimatedPrintTime),
      estimatedVolumeCm3: String(job.estimatedVolumeCm3),
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
    // Determine which material field to use based on material type
    const selectedMaterial = materials.find(m => m._id === data.materialId)
    const isResin = selectedMaterial?.type === 'resin'

    await createJob({
      clientName: data.clientName,
      materialId: data.materialId as Id<'materials'>,
      layerHeight: data.layerHeight,
      printerId: data.printerId as Id<'printers'>,
      estimatedPrintTime: data.estimatedPrintTime,
      estimatedVolumeCm3: data.estimatedVolumeCm3,
      quotedPrice: data.quotedPrice,
      materialUsedGrams: isResin ? undefined : data.materialUsedGrams,
      materialUsedMl: isResin ? data.materialUsedMl : undefined,
    })
    showToast('Job created successfully.', 'success')
  }

  async function handleEditSubmit() {
    if (!editJobData) return
    setIsEditSubmitting(true)
    try {
      const materialUsedVal = parseFloat(editJobData.materialUsed)
      const quotedPriceVal = parseFloat(editJobData.quotedPrice)
      await updateJob({
        jobId: editJobData.jobId as Id<'jobs'>,
        clientName: editJobData.clientName || undefined,
        estimatedPrintTime: parseFloat(editJobData.estimatedPrintTime) || undefined,
        estimatedVolumeCm3: parseFloat(editJobData.estimatedVolumeCm3) || undefined,
        quotedPrice: !isNaN(quotedPriceVal) && quotedPriceVal > 0 ? quotedPriceVal : undefined,
        materialUsedGrams: editJobData.materialType === 'filament' && !isNaN(materialUsedVal) ? materialUsedVal : undefined,
        materialUsedMl: editJobData.materialType === 'resin' && !isNaN(materialUsedVal) ? materialUsedVal : undefined,
      })
      showToast('Job updated.', 'success')
      setEditJobData(null)
    } catch (err) {
      showToast(`Failed to update job: ${err instanceof Error ? err.message : String(err)}`, 'error')
    } finally {
      setIsEditSubmitting(false)
    }
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
            {/* Fix 8: Filter dropdown */}
            <div className="relative">
              <button
                type="button"
                aria-label="Filter jobs"
                aria-expanded={showFilterDropdown}
                aria-haspopup="listbox"
                onClick={() => setShowFilterDropdown(v => !v)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg bg-surface-container border border-outline-variant text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors px-3 gap-2"
              >
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">filter_list</span>
                <span className="text-label-md hidden md:inline">
                  {stageFilter === ALL_STAGES ? 'Filter' : stageFilter}
                </span>
                {stageFilter !== ALL_STAGES && (
                  <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" aria-hidden="true" />
                )}
              </button>
              {showFilterDropdown && (
                <div
                  role="listbox"
                  aria-label="Filter by stage"
                  className="absolute right-0 top-12 z-20 glass-panel rounded-xl py-1 min-w-[180px] shadow-lg"
                >
                  {FILTER_OPTIONS.map(option => (
                    <button
                      key={option}
                      role="option"
                      aria-selected={stageFilter === option}
                      type="button"
                      onClick={() => { setStageFilter(option); setShowFilterDropdown(false) }}
                      className={`w-full text-left px-3 py-2 text-label-md transition-colors flex items-center gap-2 ${
                        stageFilter === option
                          ? 'text-primary bg-primary/10'
                          : 'text-on-surface hover:bg-white/5'
                      }`}
                    >
                      {stageFilter === option && (
                        <span className="material-symbols-outlined text-[14px]" aria-hidden="true">check</span>
                      )}
                      <span className={stageFilter === option ? '' : 'ml-5'}>{option}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Button variant="primary" icon="add" onClick={() => { setNewJobPrefill(undefined); setIsNewJobOpen(true) }}>
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
          onEditJob={handleEditJob}
        />
      </div>

      {/* New Job Form modal */}
      <NewJobForm
        isOpen={isNewJobOpen}
        onClose={() => { setIsNewJobOpen(false); setNewJobPrefill(undefined) }}
        materials={formMaterials}
        printers={formPrinters}
        onSubmit={handleNewJobSubmit}
        prefill={newJobPrefill}
      />

      {/* Edit Job Modal (Fix 5) */}
      {editJobData && (
        <Modal
          isOpen={!!editJobData}
          onClose={() => setEditJobData(null)}
          title="Edit Job"
          confirmLabel="Save Changes"
          onConfirm={handleEditSubmit}
          isLoading={isEditSubmitting}
        >
          <div className="flex flex-col gap-4">
            <Input
              id="edit-job-client-name"
              label="Client Name"
              value={editJobData.clientName}
              onChange={e => setEditJobData(prev => prev ? { ...prev, clientName: e.target.value } : prev)}
              placeholder="e.g. Acme Corp"
            />
            <Input
              id="edit-job-print-time"
              label="Estimated Print Time (minutes)"
              type="number"
              value={editJobData.estimatedPrintTime}
              onChange={e => setEditJobData(prev => prev ? { ...prev, estimatedPrintTime: e.target.value } : prev)}
              placeholder="e.g. 240"
              min={1}
            />
            <Input
              id="edit-job-volume"
              label="Estimated Volume (cm³)"
              type="number"
              value={editJobData.estimatedVolumeCm3}
              onChange={e => setEditJobData(prev => prev ? { ...prev, estimatedVolumeCm3: e.target.value } : prev)}
              placeholder="e.g. 45.2"
              min={0.01}
              step={0.01}
            />
            <Input
              id="edit-job-material-used"
              label={editJobData.materialType === 'resin' ? 'Material Used (ml)' : 'Material Used (g)'}
              type="number"
              value={editJobData.materialUsed}
              onChange={e => setEditJobData(prev => prev ? { ...prev, materialUsed: e.target.value } : prev)}
              placeholder="e.g. 45.2"
              min={0}
              step={0.01}
            />
            <Input
              id="edit-job-quoted-price"
              label="Quoted Price (₱)"
              type="number"
              value={editJobData.quotedPrice}
              onChange={e => setEditJobData(prev => prev ? { ...prev, quotedPrice: e.target.value } : prev)}
              placeholder="e.g. 350.00"
              min={0}
              step={0.01}
            />
          </div>
        </Modal>
      )}

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

// Re-export type for use in NewJobForm
type NewJobFormProps = {
  prefill?: Partial<{
    clientName: string
    materialId: string
    printerId: string
    estimatedPrintTime: number
    estimatedVolumeCm3: number
    quotedPrice: number
    materialUsedGrams: number
    materialUsedMl: number
  }>
}
