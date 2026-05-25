import React from 'react'
import { KanbanColumn } from './KanbanColumn'
import { JobCardProps, LivePrinterStatus } from './JobCard'
import { JobStage, STAGE_ORDER } from '../../types/index'

interface KanbanBoardProps {
  jobs: JobCardProps['job'][]
  materials: Array<{ _id: string; name: string; type: string }>
  printers: Array<{ _id: string; name: string }>
  printerStatuses: Record<string, LivePrinterStatus>
  onAdvance: (jobId: string, confirmed?: boolean) => void
  onMoveBack: (jobId: string, targetStage: JobStage) => void
}

export function KanbanBoard({
  jobs,
  materials,
  printers,
  printerStatuses,
  onAdvance,
  onMoveBack,
}: KanbanBoardProps) {
  return (
    <div className="h-full overflow-x-auto overflow-y-hidden">
      <div className="flex flex-row gap-6 h-full pl-8">
        {STAGE_ORDER.map(stage => {
          const stageJobs = jobs.filter(j => j.stage === stage)
          return (
            <KanbanColumn
              key={stage}
              stage={stage}
              jobs={stageJobs}
              materials={materials}
              printers={printers}
              printerStatuses={printerStatuses}
              onAdvance={onAdvance}
              onMoveBack={onMoveBack}
            />
          )
        })}
        <div className="w-8 flex-shrink-0" aria-hidden="true" />
      </div>
    </div>
  )
}
