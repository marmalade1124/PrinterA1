import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { GlassCard } from '../components/ui/GlassCard'
import { Badge } from '../components/ui/Badge'

export default function UsageHistoryPage() {
  const log = useQuery(api.usageLog.listAll) ?? []

  // Group by material for summary
  const byMaterial: Record<string, { name: string; type: string; total: number; jobs: number; cost: number }> = {}
  for (const entry of log) {
    if (!byMaterial[entry.materialName]) {
      byMaterial[entry.materialName] = { name: entry.materialName, type: entry.materialType, total: 0, jobs: 0, cost: 0 }
    }
    byMaterial[entry.materialName].total += entry.amountUsed
    byMaterial[entry.materialName].jobs += 1
    byMaterial[entry.materialName].cost += entry.costOfMaterial
  }
  const materialSummary = Object.values(byMaterial).sort((a, b) => b.total - a.total)

  const totalRevenue = log.reduce((sum, e) => sum + (e.quotedPrice ?? 0), 0)
  const totalMaterialCost = log.reduce((sum, e) => sum + e.costOfMaterial, 0)

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="px-8 pt-6 pb-4">
        <h1 className="text-headline-lg text-on-surface font-semibold">Usage History</h1>
        <p className="text-body-md text-on-surface-variant mt-0.5">
          Material consumption log across all completed jobs.
        </p>
      </div>

      <div className="flex-1 px-8 pb-8 max-w-4xl flex flex-col gap-6">

        {log.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[300px] rounded-xl border border-dashed border-outline-variant gap-3 text-center p-8">
            <span className="material-symbols-outlined text-[48px] text-on-surface-variant opacity-30" aria-hidden="true">history</span>
            <p className="text-body-md text-on-surface-variant opacity-60">No completed jobs yet</p>
            <p className="text-label-sm text-on-surface-variant opacity-40">Usage data appears when jobs reach "Ready for Pickup"</p>
          </div>
        ) : (
          <>
            {/* Summary totals */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <GlassCard className="p-4 flex flex-col gap-1">
                <span className="text-label-sm text-on-surface-variant uppercase tracking-wider">Total Jobs</span>
                <span className="text-headline-md text-on-surface font-bold">{log.length}</span>
              </GlassCard>
              <GlassCard className="p-4 flex flex-col gap-1">
                <span className="text-label-sm text-on-surface-variant uppercase tracking-wider">Total Revenue</span>
                <span className="text-headline-md text-primary font-bold">₱{totalRevenue.toFixed(2)}</span>
              </GlassCard>
              <GlassCard className="p-4 flex flex-col gap-1">
                <span className="text-label-sm text-on-surface-variant uppercase tracking-wider">Material Cost</span>
                <span className="text-headline-md text-on-surface font-bold">₱{totalMaterialCost.toFixed(2)}</span>
              </GlassCard>
            </div>

            {/* Per-material summary */}
            {materialSummary.length > 0 && (
              <GlassCard className="p-5 flex flex-col gap-4">
                <h2 className="text-body-lg text-on-surface font-semibold">By Material</h2>
                <div className="flex flex-col divide-y divide-white/5">
                  {materialSummary.map(m => {
                    const unit = m.type === 'filament' ? 'g' : 'ml'
                    return (
                      <div key={m.name} className="flex items-center justify-between py-3 gap-4">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-body-md text-on-surface truncate">{m.name}</span>
                          <Badge variant="status">{m.type}</Badge>
                        </div>
                        <div className="flex items-center gap-6 flex-shrink-0 text-right">
                          <div className="flex flex-col">
                            <span className="text-label-sm text-on-surface-variant">Used</span>
                            <span className="text-body-md text-on-surface">{m.total.toFixed(1)}{unit}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-label-sm text-on-surface-variant">Jobs</span>
                            <span className="text-body-md text-on-surface">{m.jobs}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-label-sm text-on-surface-variant">Cost</span>
                            <span className="text-body-md text-on-surface">₱{m.cost.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </GlassCard>
            )}

            {/* Full log */}
            <GlassCard className="p-5 flex flex-col gap-4">
              <h2 className="text-body-lg text-on-surface font-semibold">All Completed Jobs</h2>
              <div className="flex flex-col divide-y divide-white/5">
                {log.map(entry => {
                  const unit = entry.materialType === 'filament' ? 'g' : 'ml'
                  return (
                    <div key={entry._id} className="flex items-start justify-between py-3 gap-4">
                      <div className="flex flex-col min-w-0 gap-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-body-md text-on-surface font-medium truncate">{entry.clientName}</span>
                          <span className="text-label-sm text-on-surface-variant font-mono">{entry.jobNumber}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-label-sm text-on-surface-variant">{entry.materialName}</span>
                          <span className="text-label-sm text-outline">·</span>
                          <span className="text-label-sm text-on-surface-variant">{entry.amountUsed.toFixed(1)}{unit} used</span>
                          <span className="text-label-sm text-outline">·</span>
                          <span className="text-label-sm text-on-surface-variant">₱{entry.costOfMaterial.toFixed(2)} material cost</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end flex-shrink-0 gap-0.5">
                        {entry.quotedPrice != null && (
                          <span className="text-body-md text-primary font-semibold">₱{entry.quotedPrice.toFixed(2)}</span>
                        )}
                        <span className="text-label-sm text-on-surface-variant">
                          {new Date(entry.completedAt).toLocaleDateString('en-PH', {
                            month: 'short', day: 'numeric', year: 'numeric'
                          })}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </GlassCard>
          </>
        )}
      </div>
    </div>
  )
}
