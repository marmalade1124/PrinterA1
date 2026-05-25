import { useEffect, useState } from 'react'
import { Input } from '../ui/Input'
import type { PricingInputs } from '../../lib/pricingFormula'

interface MaterialOption {
  _id: string
  name: string
  type: 'filament' | 'resin'
  pricePerUnit: number
  density?: number
}

interface PrinterOption {
  _id: string
  name: string
  powerConsumptionKw: number
}

interface PricingFormProps {
  materials: MaterialOption[]
  printers: PrinterOption[]
  defaultMarkupBuffer: number
  defaultElectricityRate: number
  defaultClientHourlyRate: number
  estimatedPrintTimeMin?: number
  onChange: (inputs: Partial<PricingInputs>) => void
}

const selectClass =
  'w-full rounded-lg px-3 py-2.5 bg-surface-container border border-outline-variant text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-body-md'

export function PricingForm({
  materials,
  printers,
  defaultMarkupBuffer,
  defaultElectricityRate,
  defaultClientHourlyRate,
  estimatedPrintTimeMin,
  onChange,
}: PricingFormProps) {
  const [materialId, setMaterialId] = useState(materials[0]?._id ?? '')
  const [printerId, setPrinterId] = useState(printers[0]?._id ?? '')
  const [markupBuffer, setMarkupBuffer] = useState(String(defaultMarkupBuffer))
  const [electricityRate, setElectricityRate] = useState(String(defaultElectricityRate))
  const [clientHourlyRate, setClientHourlyRate] = useState(String(defaultClientHourlyRate))
  const [printTime, setPrintTime] = useState(
    estimatedPrintTimeMin != null ? String(Math.round(estimatedPrintTimeMin)) : ''
  )

  useEffect(() => {
    if (estimatedPrintTimeMin != null) {
      setPrintTime(String(Math.round(estimatedPrintTimeMin)))
    }
  }, [estimatedPrintTimeMin])

  useEffect(() => {
    const material = materials.find(m => m._id === materialId)
    const printer = printers.find(p => p._id === printerId)
    if (!material || !printer) return

    const partial: Partial<PricingInputs> = {
      materialType: material.type,
      pricePerUnit: material.pricePerUnit,
      density: material.density,
      powerConsumptionKw: printer.powerConsumptionKw,
      electricityRatePerKwh: parseFloat(electricityRate) || defaultElectricityRate,
      clientHourlyRate: parseFloat(clientHourlyRate) || defaultClientHourlyRate,
      markupBuffer: parseFloat(markupBuffer) || defaultMarkupBuffer,
    }
    if (printTime) {
      partial.estimatedPrintTimeMin = parseFloat(printTime) || 0
    }
    onChange(partial)
  }, [materialId, printerId, markupBuffer, electricityRate, clientHourlyRate, printTime, materials, printers])

  return (
    <div className="flex flex-col gap-4">
      {/* Material */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="pricing-material" className="text-label-md text-on-surface-variant">Material</label>
        <select id="pricing-material" value={materialId} onChange={e => setMaterialId(e.target.value)} className={selectClass}>
          {materials.map(m => (
            <option key={m._id} value={m._id}>{m.name} ({m.type})</option>
          ))}
        </select>
      </div>

      {/* Printer */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="pricing-printer" className="text-label-md text-on-surface-variant">Printer</label>
        <select id="pricing-printer" value={printerId} onChange={e => setPrinterId(e.target.value)} className={selectClass}>
          {printers.map(p => (
            <option key={p._id} value={p._id}>{p.name} ({p.powerConsumptionKw} kW)</option>
          ))}
        </select>
      </div>

      {/* Print time */}
      <Input
        id="pricing-print-time"
        label="Estimated Print Time (minutes)"
        type="number"
        value={printTime}
        onChange={e => setPrintTime(e.target.value)}
        placeholder="Auto-filled from model"
        min={0}
        step={1}
      />

      {/* Client hourly rate */}
      <Input
        id="pricing-hourly"
        label="Client Print Rate (₱/hour)"
        type="number"
        value={clientHourlyRate}
        onChange={e => setClientHourlyRate(e.target.value)}
        placeholder="e.g. 50"
        min={0}
        step={1}
      />

      {/* Electricity rate */}
      <Input
        id="pricing-electricity"
        label="Electricity Rate (₱/kWh)"
        type="number"
        value={electricityRate}
        onChange={e => setElectricityRate(e.target.value)}
        placeholder="e.g. 10.5886"
        min={0}
        step={0.0001}
      />

      {/* Markup buffer */}
      <Input
        id="pricing-markup"
        label="Markup Buffer (%)"
        type="number"
        value={markupBuffer}
        onChange={e => setMarkupBuffer(e.target.value)}
        placeholder="e.g. 15"
        min={0}
        step={1}
      />
    </div>
  )
}
