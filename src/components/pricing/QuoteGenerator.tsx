import { useRef } from 'react'
import { Button } from '../ui/Button'
import type { PricingResult } from '../../lib/pricingFormula'

interface QuoteGeneratorProps {
  result: PricingResult
  fileName: string
  volumeCm3: number
  printTimeMin: number
  materialName: string
  printerName: string
  clientName?: string
  onCopy?: () => void
}

function fmt(value: number): string {
  return '₱' + value.toFixed(2)
}

function fmtTime(minutes: number): string {
  if (minutes < 60) return Math.round(minutes) + ' min'
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  return m > 0 ? h + 'h ' + m + 'min' : h + 'h'
}

export function QuoteGenerator({
  result,
  fileName,
  volumeCm3,
  printTimeMin,
  materialName,
  printerName,
  clientName,
  onCopy,
}: QuoteGeneratorProps) {
  const quoteRef = useRef<HTMLDivElement>(null)

  function handlePrint() {
    const content = quoteRef.current
    if (!content) return

    const printWindow = window.open('', '_blank', 'width=800,height=600')
    if (!printWindow) return

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>PrintOS Quote</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Inter', Arial, sans-serif; color: #1a1a1a; background: #fff; padding: 40px; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; padding-bottom: 20px; border-bottom: 2px solid #e5e7eb; }
          .brand { font-size: 24px; font-weight: 700; color: #1a1a1a; }
          .brand-sub { font-size: 12px; color: #6b7280; margin-top: 2px; }
          .quote-title { font-size: 14px; color: #6b7280; text-align: right; }
          .quote-number { font-size: 20px; font-weight: 600; color: #1a1a1a; }
          .date { font-size: 12px; color: #6b7280; margin-top: 4px; }
          .section { margin-bottom: 24px; }
          .section-title { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; margin-bottom: 12px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
          .info-item label { font-size: 11px; color: #9ca3af; display: block; margin-bottom: 2px; }
          .info-item span { font-size: 14px; color: #1a1a1a; }
          .breakdown { width: 100%; border-collapse: collapse; }
          .breakdown td { padding: 10px 0; border-bottom: 1px solid #f3f4f6; font-size: 14px; }
          .breakdown td:last-child { text-align: right; font-weight: 500; }
          .breakdown .label { color: #6b7280; }
          .breakdown .sub { font-size: 11px; color: #9ca3af; display: block; }
          .total-row td { padding-top: 16px; border-bottom: none; font-size: 18px; font-weight: 700; color: #1a1a1a; }
          .total-row td:last-child { color: #2563eb; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; text-align: center; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="brand">PrintOS</div>
            <div class="brand-sub">3D Printing Services</div>
          </div>
          <div class="quote-title">
            <div>QUOTATION</div>
            <div class="quote-number">QT-${Date.now().toString().slice(-6)}</div>
            <div class="date">${new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
          </div>
        </div>

        ${clientName ? `
        <div class="section">
          <div class="section-title">Client</div>
          <div style="font-size: 16px; font-weight: 600;">${clientName}</div>
        </div>
        ` : ''}

        <div class="section">
          <div class="section-title">Job Details</div>
          <div class="info-grid">
            <div class="info-item"><label>File</label><span>${fileName}</span></div>
            <div class="info-item"><label>Material</label><span>${materialName}</span></div>
            <div class="info-item"><label>Volume</label><span>${volumeCm3.toFixed(2)} cm³</span></div>
            <div class="info-item"><label>Est. Print Time</label><span>${fmtTime(printTimeMin)}</span></div>
            <div class="info-item"><label>Printer</label><span>${printerName}</span></div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Cost Breakdown</div>
          <table class="breakdown">
            <tr>
              <td class="label">Material Cost</td>
              <td>${fmt(result.materialCost)}</td>
            </tr>
            <tr>
              <td class="label">Electricity Cost</td>
              <td>${fmt(result.electricityCost)}</td>
            </tr>
            <tr>
              <td class="label">
                Print Time Charge
                <span class="sub">${fmtTime(printTimeMin)}</span>
              </td>
              <td>${fmt(result.printTimeCost)}</td>
            </tr>
            <tr>
              <td class="label">Subtotal</td>
              <td>${fmt(result.subtotal)}</td>
            </tr>
            <tr>
              <td class="label">Service Markup</td>
              <td>${fmt(result.markupAmount)}</td>
            </tr>
            <tr class="total-row">
              <td>Total</td>
              <td>${fmt(result.finalPrice)}</td>
            </tr>
          </table>
        </div>

        <div class="footer">
          This quote is valid for 7 days. Prices are in Philippine Peso (₱). Generated by PrintOS.
        </div>
      </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
    }, 500)
  }

  function handleCopyText() {
    const text = [
      'QUOTATION — PrintOS 3D Printing Services',
      '─'.repeat(40),
      clientName ? `Client: ${clientName}` : '',
      `File: ${fileName}`,
      `Material: ${materialName}`,
      `Volume: ${volumeCm3.toFixed(2)} cm³`,
      `Est. Print Time: ${fmtTime(printTimeMin)}`,
      '',
      'COST BREAKDOWN',
      `Material Cost:       ${fmt(result.materialCost)}`,
      `Electricity Cost:    ${fmt(result.electricityCost)}`,
      `Print Time Charge:   ${fmt(result.printTimeCost)}`,
      `Subtotal:            ${fmt(result.subtotal)}`,
      `Service Markup:      ${fmt(result.markupAmount)}`,
      '─'.repeat(40),
      `TOTAL:               ${fmt(result.finalPrice)}`,
      '',
      `Date: ${new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}`,
      'Valid for 7 days.',
    ].filter(Boolean).join('\n')

    navigator.clipboard.writeText(text).then(() => {
      onCopy?.()
    })
  }

  return (
    <div ref={quoteRef} className="flex flex-col gap-3">
      <div className="flex gap-2">
        <Button
          variant="primary"
          icon="print"
          onClick={handlePrint}
          className="flex-1"
        >
          Print / Save PDF
        </Button>
        <Button
          variant="secondary"
          icon="content_copy"
          onClick={handleCopyText}
          className="flex-1"
        >
          Copy as Text
        </Button>
      </div>
      <p className="text-label-sm text-on-surface-variant text-center">
        Opens a print dialog — save as PDF or print directly
      </p>
    </div>
  )
}
