import { useState } from 'react'
import { Modal } from '../ui/Modal'
import { Input } from '../ui/Input'
import type { MaterialItem } from './MaterialRow'

type NewMaterialData = Omit<MaterialItem, '_id'>

interface AddMaterialFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: NewMaterialData) => Promise<void>
}

const EMPTY_FORM = {
  name: '',
  type: 'filament' as 'filament' | 'resin',
  pricePerUnit: '',
  density: '',
  stockLevel: '',
  lowStockThreshold: '',
}

interface FieldErrors {
  name?: string
  pricePerUnit?: string
  stockLevel?: string
  lowStockThreshold?: string
}

function validate(form: typeof EMPTY_FORM): FieldErrors {
  const errors: FieldErrors = {}
  if (!form.name.trim()) errors.name = 'Name is required.'
  const price = parseFloat(form.pricePerUnit)
  if (!form.pricePerUnit || isNaN(price) || price <= 0) errors.pricePerUnit = 'Must be a positive number.'
  const stock = parseFloat(form.stockLevel)
  if (!form.stockLevel || isNaN(stock) || stock < 0) errors.stockLevel = 'Must be 0 or greater.'
  const threshold = parseFloat(form.lowStockThreshold)
  if (!form.lowStockThreshold || isNaN(threshold) || threshold < 0) errors.lowStockThreshold = 'Must be 0 or greater.'
  return errors
}

const selectClass =
  'w-full rounded-lg px-3 py-2.5 bg-surface-container border border-outline-variant text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-body-md'

export function AddMaterialForm({ isOpen, onClose, onSubmit }: AddMaterialFormProps) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  function setField<K extends keyof typeof EMPTY_FORM>(field: K, value: typeof EMPTY_FORM[K]) {
    setForm(prev => ({ ...prev, [field]: value }))
    // Clear field error on change
    setErrors(prev => ({ ...prev, [field]: undefined }))
  }

  function handleClose() {
    setForm(EMPTY_FORM)
    setErrors({})
    setSubmitError(null)
    onClose()
  }

  async function handleSubmit() {
    const validationErrors = validate(form)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const data: NewMaterialData = {
        name: form.name.trim(),
        type: form.type,
        pricePerUnit: parseFloat(form.pricePerUnit),
        density: form.type === 'filament' && form.density ? parseFloat(form.density) : undefined,
        stockLevel: parseFloat(form.stockLevel),
        lowStockThreshold: parseFloat(form.lowStockThreshold),
      }
      await onSubmit(data)
      setForm(EMPTY_FORM)
      onClose()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to add material.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const unit = form.type === 'filament' ? 'g' : 'ml'

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add Material"
      confirmLabel="Add Material"
      onConfirm={handleSubmit}
      isLoading={isSubmitting}
    >
      <div className="flex flex-col gap-4">
        {submitError && (
          <p role="alert" className="text-label-sm text-error bg-error/10 border border-error/30 rounded-lg px-3 py-2">
            {submitError}
          </p>
        )}

        {/* Name */}
        <Input
          id="mat-name"
          label="Material Name"
          value={form.name}
          onChange={e => setField('name', e.target.value)}
          placeholder="e.g. PLA Tough"
          required
          error={errors.name}
        />

        {/* Type */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="mat-type" className="text-label-md text-on-surface-variant">
            Type <span className="text-error ml-1" aria-hidden="true">*</span>
          </label>
          <select
            id="mat-type"
            value={form.type}
            onChange={e => setField('type', e.target.value as 'filament' | 'resin')}
            className={selectClass}
          >
            <option value="filament">Filament (grams)</option>
            <option value="resin">Resin (ml)</option>
          </select>
        </div>

        {/* Price per unit */}
        <Input
          id="mat-price"
          label={`Price per ${unit} (₱)`}
          type="number"
          value={form.pricePerUnit}
          onChange={e => setField('pricePerUnit', e.target.value)}
          placeholder="e.g. 1.50"
          required
          min={0}
          step={0.001}
          error={errors.pricePerUnit}
        />

        {/* Density (filament only) */}
        {form.type === 'filament' && (
          <Input
            id="mat-density"
            label="Density (g/cm³) — optional"
            type="number"
            value={form.density}
            onChange={e => setField('density', e.target.value)}
            placeholder="e.g. 1.24 (PLA default)"
            min={0}
            step={0.01}
          />
        )}

        {/* Initial stock level */}
        <Input
          id="mat-stock"
          label={`Initial Stock Level (${unit})`}
          type="number"
          value={form.stockLevel}
          onChange={e => setField('stockLevel', e.target.value)}
          placeholder="e.g. 1000"
          required
          min={0}
          step={1}
          error={errors.stockLevel}
        />

        {/* Low-stock threshold */}
        <Input
          id="mat-threshold"
          label={`Low Stock Alert Threshold (${unit})`}
          type="number"
          value={form.lowStockThreshold}
          onChange={e => setField('lowStockThreshold', e.target.value)}
          placeholder="e.g. 200"
          required
          min={0}
          step={1}
          error={errors.lowStockThreshold}
        />
      </div>
    </Modal>
  )
}
