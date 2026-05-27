import React from 'react'
import { Badge } from '../ui/Badge'
import { JobCard, JobCardProps, LivePrinterStatus } from './JobCard'
import { JobStage } from '../../types/index'

interface KanbanColumnProps {
  stage: JobStage
  jobs: JobCardProps['job'][]
  materials: Array<{ _id: string; name: string }>
  printers: Array<{ _id: string; name: string }>
  printerStatuses: Record<string, LivePrinterStatus>
  onAdvance: (jobId: string, confirmed?: boolean) => void
  onMoveBack: (jobId: string, targetStage: JobStage) => void
  onEditJob: (jobId: string) => void
}

const STAGE_DOT: Record<JobStage, string> = {
  'Pending': 'bg-outline',
  'Slicing': 'bg-primary-container',
  'Printing': 'bg-tertiary-container',
  'Post-Processing': 'bg-outline-variant',
  'Ready for Pickup': 'bg-green-500',
}

const STAGE_EMPTY_ICON: Record<JobStage, string> = {
  'Pending': 'inbox',
  'Slicing': 'content_cut',
  'Printing': 'print',
  'Post-Processing': 'build',
  'Ready for Pickup': 'local_shipping',
}

export function KanbanColumn({
  stage,
  jobs,
  materials,
  printers,
  printerStatuses,
  onAdvance,
  onMoveBack,
  onEditJob,
}: KanbanColumnProps) {
  return (
    <div className="w-80 flex-shrink-0 flex flex-col h-full">
      {/* Column header */}
      <div className="flex items-center gap-2 mb-4 px-1 flex-shrink-0">
        <span
          className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${STAGE_DOT[stage]}`}
          aria-hidden="true"
        />
        <span className="text-label-md text-on-surface-variant uppercase tracking-wider font-semibold flex-1 whitespace-nowrap">
          {stage}
        </span>
        <Badge variant="count">{jobs.length}</Badge>
      </div>

      {/* Scrollable job list */}
      <div
        className="flex-1 overflow-y-auto pr-2 pb-4 space-y-4"
        role="list"
        aria-label={`${stage} jobs`}
      >
        {jobs.length === 0 ? (
          <div className="border border-dashed border-outline-variant rounded-xl p-6 flex flex-col items-center gap-2 text-center">
            <span
              className="material-symbols-outlined text-[32px] text-on-surface-variant opacity-50"
              aria-hidden="true"
            >
              {STAGE_EMPTY_ICON[stage]}
            </span>
            <p className="text-label-md text-on-surface-variant opacity-60">
              No jobs in {stage}
            </p>
          </div>
        ) : (
          jobs.map(job => {
            const material = materials.find(m => m._id === job.materialId)
            const printer = printers.find(p => p._id === job.printerId)
            return (
              <div key={job._id} role="listitem">
                <JobCard
                  job={job}
                  materialName={material?.name}
                  printerName={printer?.name}
                  liveStatus={printerStatuses[job.printerId] ?? null}
                  onAdvance={onAdvance}
                  onMoveBack={onMoveBack}
                  onEdit={onEditJob}
                />
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
