import React, { useState, useEffect } from 'react'
import { Modal } from '../ui/Modal'
import { Input } from '../ui/Input'
import { NewJobInputs, validateNewJobInputs } from '../../lib/jobCreation'

interface NewJobFormProps {
  isOpen: boolean
  onClose: () => void
  materials: Array<{ _id: string; name: string; type: 'filament' | 'resin' }>
  printers: Array<{ _id: string; name: string }>
  onSubmit: (data: NewJobInputs & { estimatedVolumeCm3: number }) => Promise<void>
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

const EMPTY_FORM = {
  clientName: '',
  materialId: '',
  layerHeight: '',
  printerId: '',
  estimatedPrintTime: '',
  estimatedVolumeCm3: '',
  materialUsed: '',
  quotedPrice: '',
}

export function NewJobForm({ isOpen, onClose, materials, printers, onSubmit, prefill }: NewJobFormProps) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Apply prefill when modal opens or prefill changes
  useEffect(() => {
    if (isOpen && prefill) {
      const selectedMaterial = materials.find(m => m._id === prefill.materialId)
      const materialUsedVal = selectedMaterial?.type === 'resin'
        ? prefill.materialUsedMl
        : prefill.materialUsedGrams
      setForm({
        clientName: prefill.clientName ?? '',
        materialId: prefill.materialId ?? '',
        layerHeight: '',
        printerId: prefill.printerId ?? '',
        estimatedPrintTime: prefill.estimatedPrintTime != null ? String(prefill.estimatedPrintTime) : '',
        estimatedVolumeCm3: prefill.estimatedVolumeCm3 != null ? String(prefill.estimatedVolumeCm3) : '',
        materialUsed: materialUsedVal != null ? String(materialUsedVal) : '',
        quotedPrice: prefill.quotedPrice != null ? String(prefill.quotedPrice) : '',
      })
    } else if (!isOpen) {
      setForm(EMPTY_FORM)
      setErrors([])
    }
  }, [isOpen, prefill])

  function handleClose() {
    setForm(EMPTY_FORM)
    setErrors([])
    onClose()
  }

  function setField(field: keyof typeof EMPTY_FORM, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const selectedMaterial = materials.find(m => m._id === form.materialId)
  const materialUnit = selectedMaterial?.type === 'resin' ? 'ml' : 'g'
  const materialUsedLabel = selectedMaterial?.type === 'resin'
    ? 'Material Used (ml)'
    : 'Material Used (g)'

  async function handleSubmit() {
    const inputs: NewJobInputs = {
      clientName: form.clientName,
      materialId: form.materialId,
      layerHeight: parseFloat(form.layerHeight) || 0,
      printerId: form.printerId,
      estimatedPrintTime: parseFloat(form.estimatedPrintTime) || 0,
      estimatedVolumeCm3: parseFloat(form.estimatedVolumeCm3) || 0,
    }

    // Attach material used and quoted price
    const materialUsedVal = parseFloat(form.materialUsed)
    if (!isNaN(materialUsedVal) && materialUsedVal > 0) {
      if (selectedMaterial?.type === 'resin') {
        inputs.materialUsedMl = materialUsedVal
      } else {
        inputs.materialUsedGrams = materialUsedVal
      }
    }
    const quotedPriceVal = parseFloat(form.quotedPrice)
    if (!isNaN(quotedPriceVal) && quotedPriceVal > 0) {
      inputs.quotedPrice = quotedPriceVal
    }

    const validationErrors = validateNewJobInputs(inputs)

    // Validate material used
    if (!form.materialUsed || isNaN(parseFloat(form.materialUsed)) || parseFloat(form.materialUsed) < 0.01) {
      validationErrors.push(`Material used is required (min 0.01 ${materialUnit}).`)
    }

    if (validationErrors.length > 0) {
      setErrors(validationErrors)
      return
    }

    setErrors([])
    setIsSubmitting(true)
    try {
      await onSubmit(inputs)
      setForm(EMPTY_FORM)
      onClose()
    } catch (err) {
      setErrors([err instanceof Error ? err.message : 'Failed to create job. Please try again.'])
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectClass =
    'w-full rounded-lg px-3 py-2.5 bg-surface-container border border-outline-variant text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors'

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="New Print Job"
      confirmLabel="Create Job"
      onConfirm={handleSubmit}
      isLoading={isSubmitting}
    >
      <div className="flex flex-col gap-4">
        {/* Validation errors */}
        {errors.length > 0 && (
          <div
            role="alert"
            className="rounded-lg bg-error/10 border border-error/30 px-3 py-2"
          >
            <ul className="list-disc list-inside space-y-0.5">
              {errors.map((e, i) => (
                <li key={i} className="text-label-sm text-error">{e}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Client Name */}
        <Input
          id="new-job-client-name"
          label="Client Name"
          type="text"
          value={form.clientName}
          onChange={e => setField('clientName', e.target.value)}
          placeholder="e.g. Acme Corp"
          required
        />

        {/* Material */}
        <div className="flex flex-col">
          <label htmlFor="new-job-material" className="text-label-md text-on-surface-variant mb-1.5">
            Material <span className="text-error ml-1" aria-hidden="true">*</span>
          </label>
          <select
            id="new-job-material"
            value={form.materialId}
            onChange={e => setField('materialId', e.target.value)}
            required
            className={selectClass}
          >
            <option value="" disabled>Select a material…</option>
            {materials.map(m => (
              <option key={m._id} value={m._id}>
                {m.name} ({m.type})
              </option>
            ))}
          </select>
        </div>

        {/* Layer Height */}
        <Input
          id="new-job-layer-height"
          label="Layer Height (mm)"
          type="number"
          value={form.layerHeight}
          onChange={e => setField('layerHeight', e.target.value)}
          placeholder="e.g. 0.2"
          required
          min={0.05}
          max={1.0}
          step={0.05}
        />

        {/* Printer */}
        <div className="flex flex-col">
          <label htmlFor="new-job-printer" className="text-label-md text-on-surface-variant mb-1.5">
            Printer <span className="text-error ml-1" aria-hidden="true">*</span>
          </label>
          <select
            id="new-job-printer"
            value={form.printerId}
            onChange={e => setField('printerId', e.target.value)}
            required
            className={selectClass}
          >
            <option value="" disabled>Select a printer…</option>
            {printers.map(p => (
              <option key={p._id} value={p._id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Estimated Print Time */}
        <Input
          id="new-job-print-time"
          label="Estimated Print Time (minutes)"
          type="number"
          value={form.estimatedPrintTime}
          onChange={e => setField('estimatedPrintTime', e.target.value)}
          placeholder="e.g. 240"
          required
          min={1}
        />

        {/* Estimated Volume */}
        <Input
          id="new-job-volume"
          label="Estimated Volume (cm³)"
          type="number"
          value={form.estimatedVolumeCm3}
          onChange={e => setField('estimatedVolumeCm3', e.target.value)}
          placeholder="e.g. 45.2"
          required
          min={0.01}
          step={0.01}
        />

        {/* Material Used */}
        <Input
          id="new-job-material-used"
          label={materialUsedLabel}
          type="number"
          value={form.materialUsed}
          onChange={e => setField('materialUsed', e.target.value)}
          placeholder={selectedMaterial?.type === 'resin' ? 'e.g. 30.5' : 'e.g. 45.2'}
          required
          min={0.01}
          step={0.01}
        />

        {/* Quoted Price (optional) */}
        <Input
          id="new-job-quoted-price"
          label="Quoted Price (₱) — optional"
          type="number"
          value={form.quotedPrice}
          onChange={e => setField('quotedPrice', e.target.value)}
          placeholder="e.g. 350.00"
          min={0}
          step={0.01}
        />
      </div>
    </Modal>
  )
}
