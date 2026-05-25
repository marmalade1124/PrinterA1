import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { GlassCard } from '../components/ui/GlassCard'
import { Badge } from '../components/ui/Badge'
import { useNavigate } from 'react-router-dom'

function StatCard({
  icon,
  label,
  value,
  sub,
  accent = false,
}: {
  icon: string
  label: string
  value: string
  sub?: string
  accent?: boolean
}) {
  return (
    <GlassCard className="p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-label-md text-on-surface-variant uppercase tracking-wider">{label}</span>
        <span
          className={`material-symbols-outlined text-[22px] ${accent ? 'text-primary' : 'text-on-surface-variant'}`}
          aria-hidden="true"
        >
          {icon}
        </span>
      </div>
      <div>
        <p className={`text-headline-lg font-bold ${accent ? 'text-primary' : 'text-on-surface'}`}>{value}</p>
        {sub && <p className="text-label-sm text-on-surface-variant mt-0.5">{sub}</p>}
      </div>
    </GlassCard>
  )
}

export default function DashboardPage() {
  const stats = useQuery(api.usageLog.summary)
  const materials = useQuery(api.materials.listAll) ?? []
  const printerStatuses = useQuery(api.printerStatus.listAll) ?? []
  const recentLog = useQuery(api.usageLog.listAll) ?? []
  const navigate = useNavigate()

  const lowStockMaterials = materials.filter(m => m.stockLevel <= m.lowStockThreshold)
  const onlinePrinters = printerStatuses.filter(p => (Date.now() - p.updatedAt) < 120000)
  const printingPrinters = onlinePrinters.filter(p => p.gcodeState === 'RUNNING')

  const recentJobs = recentLog.slice(0, 5)

  return (
    <div className="flex flex-col h-full overflow-auto">
      {/* Header */}
      <div className="px-8 pt-6 pb-4">
        <h1 className="text-headline-lg text-on-surface font-semibold">Dashboard</h1>
        <p className="text-body-md text-on-surface-variant mt-0.5">
          Your 3D printing business at a glance.
        </p>
      </div>

      <div className="flex-1 px-8 pb-8 flex flex-col gap-6 max-w-5xl">

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon="work"
            label="Jobs This Week"
            value={String(stats?.jobsThisWeek ?? 0)}
            sub={`${stats?.completedThisWeek ?? 0} completed`}
          />
          <StatCard
            icon="payments"
            label="Revenue This Week"
            value={'₱' + (stats?.revenueThisWeek ?? 0).toFixed(2)}
            sub={'₱' + (stats?.materialCostThisWeek ?? 0).toFixed(2) + ' material cost'}
            accent
          />
          <StatCard
            icon="pending_actions"
            label="Active Jobs"
            value={String(stats?.activeJobs ?? 0)}
            sub={`${stats?.printingJobs ?? 0} printing now`}
          />
          <StatCard
            icon="precision_manufacturing"
            label="Printers Online"
            value={String(onlinePrinters.length)}
            sub={printingPrinters.length > 0 ? `${printingPrinters.length} printing` : 'All idle'}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Printer status */}
          <GlassCard className="p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-body-lg text-on-surface font-semibold">Printer Status</h2>
              <button
                onClick={() => navigate('/printers')}
                className="text-label-sm text-primary hover:underline"
              >
                View all
              </button>
            </div>
            {printerStatuses.length === 0 ? (
              <p className="text-body-md text-on-surface-variant opacity-60">
                No printer data. Start the Bambu bridge to see live status.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {printerStatuses.map(p => {
                  const isOnline = (Date.now() - p.updatedAt) < 120000
                  const isRunning = isOnline && p.gcodeState === 'RUNNING'
                  return (
                    <div key={p.serialNumber} className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[18px] text-on-surface-variant" aria-hidden="true">
                            precision_manufacturing
                          </span>
                          <span className="text-body-md text-on-surface">{p.printerName}</span>
                        </div>
                        {isRunning ? (
                          <Badge variant="alert">
                            <span className="relative flex h-1.5 w-1.5 mr-1">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tertiary opacity-75" />
                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-tertiary" />
                            </span>
                            {p.progressPercent}% · {p.remainingMinutes}min left
                          </Badge>
                        ) : (
                          <Badge variant="status">{isOnline ? p.gcodeState : 'Offline'}</Badge>
                        )}
                      </div>
                      {isRunning && (
                        <div className="h-1 w-full bg-surface-container-lowest rounded-full overflow-hidden">
                          <div
                            className="h-full bg-tertiary-container rounded-full transition-all duration-500"
                            style={{ width: p.progressPercent + '%' }}
                          />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </GlassCard>

          {/* Low stock alerts */}
          <GlassCard className="p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-body-lg text-on-surface font-semibold flex items-center gap-2">
                Low Stock
                {lowStockMaterials.length > 0 && (
                  <Badge variant="alert">{lowStockMaterials.length}</Badge>
                )}
              </h2>
              <button
                onClick={() => navigate('/inventory')}
                className="text-label-sm text-primary hover:underline"
              >
                View inventory
              </button>
            </div>
            {lowStockMaterials.length === 0 ? (
              <div className="flex items-center gap-2 text-body-md text-on-surface-variant opacity-60">
                <span className="material-symbols-outlined text-green-500 text-[18px]" aria-hidden="true">check_circle</span>
                All materials are well stocked
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {lowStockMaterials.map(m => {
                  const unit = m.type === 'filament' ? 'g' : 'ml'
                  const pct = Math.round((m.stockLevel / m.lowStockThreshold) * 100)
                  return (
                    <div key={m._id} className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-body-md text-on-surface">{m.name}</span>
                        <span className="text-label-sm text-error">{m.stockLevel}{unit} left</span>
                      </div>
                      <div className="h-1 w-full bg-surface-container-lowest rounded-full overflow-hidden">
                        <div
                          className="h-full bg-error rounded-full"
                          style={{ width: Math.min(100, pct) + '%' }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </GlassCard>
        </div>

        {/* Top materials */}
        {stats?.topMaterials && stats.topMaterials.length > 0 && (
          <GlassCard className="p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-body-lg text-on-surface font-semibold">Most Used Materials</h2>
              <button
                onClick={() => navigate('/usage')}
                className="text-label-sm text-primary hover:underline"
              >
                Full history
              </button>
            </div>
            <div className="flex flex-col gap-3">
              {stats.topMaterials.map((m, i) => {
                const unit = m.type === 'filament' ? 'g' : 'ml'
                const maxUsage = stats.topMaterials[0].total
                return (
                  <div key={m.name} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-label-sm text-on-surface-variant w-4">{i + 1}.</span>
                        <span className="text-body-md text-on-surface">{m.name}</span>
                        <Badge variant="status">{m.type}</Badge>
                      </div>
                      <span className="text-label-sm text-on-surface-variant">{m.total.toFixed(1)}{unit}</span>
                    </div>
                    <div className="h-1 w-full bg-surface-container-lowest rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: (m.total / maxUsage * 100) + '%' }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </GlassCard>
        )}

        {/* Recent completed jobs */}
        {recentJobs.length > 0 && (
          <GlassCard className="p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-body-lg text-on-surface font-semibold">Recently Completed</h2>
              <button
                onClick={() => navigate('/usage')}
                className="text-label-sm text-primary hover:underline"
              >
                View all
              </button>
            </div>
            <div className="flex flex-col divide-y divide-white/5">
              {recentJobs.map(entry => (
                <div key={entry._id} className="flex items-center justify-between py-2.5 gap-4">
                  <div className="flex flex-col min-w-0">
                    <span className="text-body-md text-on-surface truncate">{entry.clientName}</span>
                    <span className="text-label-sm text-on-surface-variant">
                      {entry.jobNumber} · {entry.materialName} · {entry.amountUsed.toFixed(1)}{entry.materialType === 'filament' ? 'g' : 'ml'}
                    </span>
                  </div>
                  <div className="flex flex-col items-end flex-shrink-0">
                    {entry.quotedPrice != null && (
                      <span className="text-body-md text-primary font-medium">₱{entry.quotedPrice.toFixed(2)}</span>
                    )}
                    <span className="text-label-sm text-on-surface-variant">
                      {new Date(entry.completedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        )}
      </div>
    </div>
  )
}
