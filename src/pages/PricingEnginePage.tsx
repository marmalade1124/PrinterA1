import { useState, useEffect } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { FileUploadZone } from '../components/pricing/FileUploadZone'
import { PricingForm } from '../components/pricing/PricingForm'
import { CostBreakdown } from '../components/pricing/CostBreakdown'
import { QuoteGenerator } from '../components/pricing/QuoteGenerator'
import { Input } from '../components/ui/Input'
import { useToast } from '../components/ui/Toast'
import { calculatePrice, PricingInputs, PricingResult } from '../lib/pricingFormula'

interface ParsedModel {
  volumeCm3: number
  estimatedPrintTimeMin: number
  fileName: string
}

export default function PricingEnginePage() {
  const materials = useQuery(api.materials.listAll) ?? []
  const printers = useQuery(api.printers.listAll) ?? []
  const settings = useQuery(api.settings.get) ?? { electricityRatePerKwh: 10.5886, defaultMarkupBuffer: 15, clientHourlyRate: 50 }

  const { showToast } = useToast()

  const [parsedModel, setParsedModel] = useState<ParsedModel | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [pricingInputs, setPricingInputs] = useState<Partial<PricingInputs>>({})
  const [pricingResult, setPricingResult] = useState<PricingResult | null>(null)
  const [clientName, setClientName] = useState('')
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>('')
  const [selectedPrinterId, setSelectedPrinterId] = useState<string>('')

  useEffect(() => {
    if (!parsedModel) { setPricingResult(null); return }
    const { materialType, pricePerUnit, powerConsumptionKw, electricityRatePerKwh, markupBuffer, clientHourlyRate } = pricingInputs
    if (materialType == null || pricePerUnit == null || powerConsumptionKw == null || electricityRatePerKwh == null || markupBuffer == null || clientHourlyRate == null) return
    try {
      setPricingResult(calculatePrice({
        volumeCm3: parsedModel.volumeCm3,
        estimatedPrintTimeMin: pricingInputs.estimatedPrintTimeMin ?? parsedModel.estimatedPrintTimeMin,
        materialType, pricePerUnit, density: pricingInputs.density,
        powerConsumptionKw, electricityRatePerKwh, markupBuffer, clientHourlyRate,
      }))
    } catch { setPricingResult(null) }
  }, [parsedModel, pricingInputs])

  const formMaterials = materials.map(m => ({ _id: m._id as string, name: m.name, type: m.type, pricePerUnit: m.pricePerUnit, density: m.density }))
  const formPrinters = printers.map(p => ({ _id: p._id as string, name: p.name, powerConsumptionKw: p.powerConsumptionKw }))

  const selectedMaterial = formMaterials.find(m => m._id === selectedMaterialId) ?? formMaterials[0]
  const selectedPrinter = formPrinters.find(p => p._id === selectedPrinterId) ?? formPrinters[0]
  const printTimeMin = pricingInputs.estimatedPrintTimeMin ?? parsedModel?.estimatedPrintTimeMin ?? 0

  function handleCopyText() {
    showToast('Quote copied to clipboard.', 'success')
  }

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="flex-shrink-0 px-8 pt-6 pb-4">
        <h1 className="text-headline-lg text-on-surface font-semibold">Pricing Engine</h1>
        <p className="text-body-md text-on-surface-variant mt-0.5">Upload a 3D model to get an instant cost estimate and generate a client quote.</p>
      </div>
      <div className="flex-1 px-8 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl">

          {/* Left column */}
          <div className="flex flex-col gap-6">
            {/* Client name */}
            <div>
              <h2 className="text-label-md text-on-surface-variant uppercase tracking-wider mb-3">Client</h2>
              <Input
                id="client-name"
                label="Client Name (optional)"
                value={clientName}
                onChange={e => setClientName(e.target.value)}
                placeholder="e.g. NovaTech Industries"
              />
            </div>

            {/* File upload */}
            <div>
              <h2 className="text-label-md text-on-surface-variant uppercase tracking-wider mb-3">3D Model</h2>
              <FileUploadZone
                onParsed={r => { setParsedModel(r); setParseError(null) }}
                onError={e => { setParsedModel(null); setParseError(e); setPricingResult(null) }}
              />
              {parseError && <p role="alert" className="text-label-sm text-error mt-2">{parseError}</p>}
            </div>

            {/* Pricing parameters */}
            <div>
              <h2 className="text-label-md text-on-surface-variant uppercase tracking-wider mb-3">Pricing Parameters</h2>
              <div className="glass-card rounded-xl p-5">
                {formMaterials.length > 0 && formPrinters.length > 0 ? (
                  <PricingForm
                    materials={formMaterials}
                    printers={formPrinters}
                    defaultMarkupBuffer={settings.defaultMarkupBuffer}
                    defaultElectricityRate={settings.electricityRatePerKwh}
                    defaultClientHourlyRate={settings.clientHourlyRate}
                    estimatedPrintTimeMin={parsedModel?.estimatedPrintTimeMin}
                    onChange={inputs => {
                      setPricingInputs(prev => ({ ...prev, ...inputs }))
                      // Track selected material/printer for quote
                      if (inputs.materialType) {
                        const mat = formMaterials.find(m => m.type === inputs.materialType && m.pricePerUnit === inputs.pricePerUnit)
                        if (mat) setSelectedMaterialId(mat._id)
                      }
                    }}
                  />
                ) : (
                  <p className="text-body-md text-on-surface-variant">
                    Add materials and printers in the Inventory and Printers pages first.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="text-label-md text-on-surface-variant uppercase tracking-wider mb-3">Cost Estimate</h2>
              <CostBreakdown
                result={pricingResult}
                fileName={parsedModel?.fileName}
                volumeCm3={parsedModel?.volumeCm3}
                printTimeMin={printTimeMin}
              />
            </div>

            {/* Quote generator — only show when we have a result */}
            {pricingResult && parsedModel && (
              <div>
                <h2 className="text-label-md text-on-surface-variant uppercase tracking-wider mb-3">Generate Quote</h2>
                <div className="glass-card rounded-xl p-5">
                  <QuoteGenerator
                    result={pricingResult}
                    fileName={parsedModel.fileName}
                    volumeCm3={parsedModel.volumeCm3}
                    printTimeMin={printTimeMin}
                    materialName={selectedMaterial?.name ?? 'Unknown'}
                    printerName={selectedPrinter?.name ?? 'Unknown'}
                    clientName={clientName || undefined}
                    onCopy={handleCopyText}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
