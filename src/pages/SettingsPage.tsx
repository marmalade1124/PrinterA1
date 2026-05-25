import React, { useState, useEffect } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { GlassCard } from '../components/ui/GlassCard'
import { useToast } from '../components/ui/Toast'

interface SettingsFormState {
  electricityRatePerKwh: string
  clientHourlyRate: string
  defaultMarkupBuffer: string
}

interface FieldErrors {
  electricityRatePerKwh?: string
  clientHourlyRate?: string
  defaultMarkupBuffer?: string
}

function validate(values: SettingsFormState): FieldErrors {
  const errors: FieldErrors = {}
  const rate = parseFloat(values.electricityRatePerKwh)
  if (!values.electricityRatePerKwh || isNaN(rate)) errors.electricityRatePerKwh = 'Must be a valid number.'
  else if (rate < 0) errors.electricityRatePerKwh = 'Must be 0 or greater.'
  const hourly = parseFloat(values.clientHourlyRate)
  if (!values.clientHourlyRate || isNaN(hourly)) errors.clientHourlyRate = 'Must be a valid number.'
  else if (hourly < 0) errors.clientHourlyRate = 'Must be 0 or greater.'
  const markup = parseFloat(values.defaultMarkupBuffer)
  if (!values.defaultMarkupBuffer || isNaN(markup)) errors.defaultMarkupBuffer = 'Must be a valid number.'
  else if (markup < 0) errors.defaultMarkupBuffer = 'Must be 0 or greater.'
  return errors
}

export function SettingsPage() {
  const settings = useQuery(api.settings.get)
  const upsertSettings = useMutation(api.settings.upsert)
  const { showToast } = useToast()

  const [form, setForm] = useState<SettingsFormState>({
    electricityRatePerKwh: '10.5886',
    clientHourlyRate: '50',
    defaultMarkupBuffer: '15',
  })
  const [errors, setErrors] = useState<FieldErrors>({})
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (settings) {
      setForm({
        electricityRatePerKwh: String(settings.electricityRatePerKwh),
        clientHourlyRate: String(settings.clientHourlyRate),
        defaultMarkupBuffer: String(settings.defaultMarkupBuffer),
      })
    }
  }, [settings])

  function handleChange(field: keyof SettingsFormState) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const updated = { ...form, [field]: e.target.value }
      setForm(updated)
      setErrors(validate(updated))
    }
  }

  const isValid = Object.keys(validate(form)).length === 0

  async function handleSave() {
    const validationErrors = validate(form)
    if (Object.keys(validationErrors).length > 0) { setErrors(validationErrors); return }
    setIsSaving(true)
    try {
      await upsertSettings({
        electricityRatePerKwh: parseFloat(form.electricityRatePerKwh),
        clientHourlyRate: parseFloat(form.clientHourlyRate),
        defaultMarkupBuffer: parseFloat(form.defaultMarkupBuffer),
      })
      showToast('Settings saved successfully.', 'success')
    } catch {
      showToast('Failed to save settings. Please try again.', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="px-8 pt-6 pb-4">
        <h1 className="text-headline-lg text-on-surface font-semibold">Settings</h1>
        <p className="text-body-md text-on-surface-variant mt-0.5">Configure your default pricing parameters.</p>
      </div>
      <div className="flex-1 px-8 pb-8">
        <div className="max-w-xl mx-auto flex flex-col gap-6">

          {/* Electricity */}
          <GlassCard className="p-6 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]" aria-hidden="true">bolt</span>
              <h2 className="text-body-lg text-on-surface font-semibold">Electricity</h2>
            </div>
            <p className="text-label-sm text-on-surface-variant -mt-2">
              NORDECO Residential rate — May 2026
            </p>
            <Input
              id="electricityRatePerKwh"
              label="Electricity Rate (₱/kWh)"
              type="number"
              value={form.electricityRatePerKwh}
              onChange={handleChange('electricityRatePerKwh')}
              placeholder="e.g. 10.5886"
              min={0}
              step={0.0001}
              error={errors.electricityRatePerKwh}
              required
            />
          </GlassCard>

          {/* Client pricing */}
          <GlassCard className="p-6 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]" aria-hidden="true">payments</span>
              <h2 className="text-body-lg text-on-surface font-semibold">Client Pricing</h2>
            </div>
            <Input
              id="clientHourlyRate"
              label="Print Time Rate (₱/hour)"
              type="number"
              value={form.clientHourlyRate}
              onChange={handleChange('clientHourlyRate')}
              placeholder="e.g. 50"
              min={0}
              step={1}
              error={errors.clientHourlyRate}
              required
            />
            <Input
              id="defaultMarkupBuffer"
              label="Default Markup Buffer (%)"
              type="number"
              value={form.defaultMarkupBuffer}
              onChange={handleChange('defaultMarkupBuffer')}
              placeholder="e.g. 15"
              min={0}
              step={0.1}
              error={errors.defaultMarkupBuffer}
              required
            />
          </GlassCard>

          <Button variant="primary" onClick={handleSave} disabled={!isValid || isSaving} icon="save">
            {isSaving ? 'Saving…' : 'Save Settings'}
          </Button>
        </div>
      </div>
    </div>
  )
}
