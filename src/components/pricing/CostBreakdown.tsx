import { GlassCard } from '../ui/GlassCard'
import type { PricingResult } from '../../lib/pricingFormula'

interface CostBreakdownProps {
  result: PricingResult | null
  fileName?: string
  volumeCm3?: number
  printTimeMin?: number
}

function fmt(value: number): string {
  return '₱' + value.toFixed(2)
}

function fmtTime(minutes: number): string {
  if (minutes < 60) return Math.round(minutes) + 'm'
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  return m > 0 ? h + 'h ' + m + 'm' : h + 'h'
}

export function CostBreakdown({ result, fileName, volumeCm3, printTimeMin }: CostBreakdownProps) {
  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[200px] rounded-xl border border-dashed border-outline-variant p-8 text-center gap-3">
        <span className="material-symbols-outlined text-[40px] text-on-surface-variant opacity-40" aria-hidden="true">
          calculate
        </span>
        <p className="text-body-md text-on-surface-variant opacity-60">
          Upload a 3D model to see the cost estimate
        </p>
      </div>
    )
  }

  const rows = [
    { label: 'Material Cost', value: fmt(result.materialCost), sub: volumeCm3 != null ? volumeCm3.toFixed(2) + ' cm³' : undefined },
    { label: 'Electricity Cost', value: fmt(result.electricityCost), sub: 'actual power draw' },
    { label: 'Print Time Charge', value: fmt(result.printTimeCost), sub: printTimeMin != null ? fmtTime(printTimeMin) + ' @ ₱50/hr' : '₱50/hr' },
    { label: 'Subtotal', value: fmt(result.subtotal), sub: undefined },
    { label: 'Markup', value: fmt(result.markupAmount), sub: undefined },
  ]

  return (
    <div className="flex flex-col gap-4">
      {fileName && (
        <div className="flex items-center gap-2 text-label-md text-on-surface-variant">
          <span className="material-symbols-outlined text-[16px]" aria-hidden="true">description</span>
          <span className="truncate">{fileName}</span>
          {volumeCm3 != null && (
            <span className="ml-auto flex-shrink-0 text-primary">{volumeCm3.toFixed(2)} cm³</span>
          )}
        </div>
      )}

      <GlassCard className="p-5 flex flex-col gap-0">
        <h3 className="text-label-md text-on-surface-variant uppercase tracking-wider mb-4">
          Cost Breakdown
        </h3>

        <div className="flex flex-col divide-y divide-white/5">
          {rows.map(({ label, value, sub }) => (
            <div key={label} className="flex items-center justify-between py-2.5 gap-4">
              <div className="flex flex-col">
                <span className="text-body-md text-on-surface-variant">{label}</span>
                {sub && <span className="text-label-sm text-outline">{sub}</span>}
              </div>
              <span className="text-body-md text-on-surface font-medium flex-shrink-0">{value}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pt-4 mt-2 border-t border-white/10">
          <span className="text-body-lg text-on-surface font-semibold">Final Price</span>
          <span className="text-headline-md text-primary font-bold">
            {fmt(result.finalPrice)}
          </span>
        </div>
      </GlassCard>
    </div>
  )
}
