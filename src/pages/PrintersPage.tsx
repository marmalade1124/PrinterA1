import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { GlassCard } from '../components/ui/GlassCard'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Modal } from '../components/ui/Modal'
import { Input } from '../components/ui/Input'
import { useToast } from '../components/ui/Toast'
import type { Id } from '../../convex/_generated/dataModel'

interface PrinterFormData {
  name: string
  powerConsumptionKw: string
}

interface FormErrors {
  name?: string
  powerConsumptionKw?: string
}

function validateForm(form: PrinterFormData): FormErrors {
  const errors: FormErrors = {}
  if (!form.name.trim()) errors.name = 'Printer name is required.'
  const kw = parseFloat(form.powerConsumptionKw)
  if (!form.powerConsumptionKw || isNaN(kw) || kw <= 0)
    errors.powerConsumptionKw = 'Must be a positive number.'
  return errors
}

const EMPTY_FORM: PrinterFormData = { name: '', powerConsumptionKw: '' }

export default function PrintersPage() {
  const printers = useQuery(api.printers.listAll) ?? []
  const printerStatuses = useQuery(api.printerStatus.listAll) ?? []
  const settings = useQuery(api.settings.get) ?? { electricityRatePerKwh: 10.5886 }
  const createPrinter = useMutation(api.printers.create)
  const updatePrinter = useMutation(api.printers.update)
  const removePrinter = useMutation(api.printers.remove)

  const { showToast } = useToast()

  const [isAddOpen, setIsAddOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [form, setForm] = useState<PrinterFormData>(EMPTY_FORM)
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Build status map by printer name
  const statusByName: Record<string, typeof printerStatuses[0]> = {}
  for (const s of printerStatuses) {
    statusByName[s.printerName] = s
  }

  function openAdd() {
    setForm(EMPTY_FORM)
    setErrors({})
    setIsAddOpen(true)
  }

  function openEdit(printer: { _id: string; name: string; powerConsumptionKw: number }) {
    setForm({ name: printer.name, powerConsumptionKw: String(printer.powerConsumptionKw) })
    setErrors({})
    setEditingId(printer._id)
  }

  function handleFormChange(field: keyof PrinterFormData, value: string) {
    const updated = { ...form, [field]: value }
    setForm(updated)
    setErrors(prev => ({ ...prev, [field]: undefined }))
  }

  async function handleAdd() {
    const errs = validateForm(form)
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setIsSubmitting(true)
    try {
      await createPrinter({
        name: form.name.trim(),
        powerConsumptionKw: parseFloat(form.powerConsumptionKw),
      })
      showToast(`${form.name} added.`, 'success')
      setIsAddOpen(false)
    } catch {
      showToast('Failed to add printer.', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleEdit() {
    if (!editingId) return
    const errs = validateForm(form)
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setIsSubmitting(true)
    try {
      await updatePrinter({
        printerId: editingId as Id<'printers'>,
        name: form.name.trim(),
        powerConsumptionKw: parseFloat(form.powerConsumptionKw),
      })
      showToast('Printer updated.', 'success')
      setEditingId(null)
    } catch {
      showToast('Failed to update printer.', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!deletingId) return
    setIsSubmitting(true)
    try {
      await removePrinter({ printerId: deletingId as Id<'printers'> })
      showToast('Printer deleted.', 'success')
      setDeletingId(null)
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      if (msg.includes('PRINTER_IN_USE')) {
        showToast('This printer has active jobs and cannot be deleted.', 'error')
      } else {
        showToast('Failed to delete printer.', 'error')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const deletingPrinter = printers.find(p => p._id === deletingId)

  return (
    <div className="flex flex-col h-full overflow-auto">
      {/* Header */}
      <div className="px-8 pt-6 pb-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-headline-lg text-on-surface font-semibold">Printers</h1>
            <p className="text-body-md text-on-surface-variant mt-0.5">
              Manage your 3D printers and view live status.
            </p>
          </div>
          <Button variant="primary" icon="add" onClick={openAdd}>
            Add Printer
          </Button>
        </div>
      </div>

      {/* Printer grid */}
      <div className="flex-1 px-8 pb-8">
        {printers.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[300px] rounded-xl border border-dashed border-outline-variant gap-4 text-center p-8">
            <span className="material-symbols-outlined text-[48px] text-on-surface-variant opacity-30" aria-hidden="true">
              precision_manufacturing
            </span>
            <div>
              <p className="text-body-lg text-on-surface-variant opacity-60">No printers yet</p>
              <p className="text-label-md text-on-surface-variant opacity-40 mt-1">Add your first printer to get started</p>
            </div>
            <Button variant="primary" icon="add" onClick={openAdd}>Add Printer</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 max-w-5xl">
            {printers.map(printer => {
              const status = statusByName[printer.name]
              const isOnline = status && (Date.now() - status.updatedAt) < 120000
              const isRunning = isOnline && status.gcodeState === 'RUNNING'
              const isPaused = isOnline && status.gcodeState === 'PAUSE'
              const isFinished = isOnline && status.gcodeState === 'FINISH'

              return (
                <GlassCard key={printer._id} className="p-5 flex flex-col gap-4">
                  {/* Printer header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-outlined text-primary text-[22px]" aria-hidden="true">
                          precision_manufacturing
                        </span>
                      </div>
                      <div>
                        <h2 className="text-body-md text-on-surface font-semibold">{printer.name}</h2>
                        <p className="text-label-sm text-on-surface-variant">{printer.powerConsumptionKw} kW</p>
                      </div>
                    </div>
                    {/* Status badge */}
                    {isRunning && (
                      <Badge variant="alert">
                        <span className="relative flex h-1.5 w-1.5 mr-1">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tertiary opacity-75" />
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-tertiary" />
                        </span>
                        Printing
                      </Badge>
                    )}
                    {isPaused && <Badge variant="status">Paused</Badge>}
                    {isFinished && <Badge variant="count">Done</Badge>}
                    {isOnline && !isRunning && !isPaused && !isFinished && (
                      <Badge variant="status">Idle</Badge>
                    )}
                    {!isOnline && status && <Badge variant="status">Offline</Badge>}
                  </div>

                  {/* Live stats (when printing) */}
                  {isRunning && status && (
                    <div className="flex flex-col gap-2">
                      {/* Progress bar */}
                      <div className="flex items-center justify-between text-label-sm text-on-surface-variant mb-1">
                        <span>{status.gcodeFile ? status.gcodeFile.split('/').pop()?.replace('.gcode', '') : 'Printing…'}</span>
                        <span>{status.progressPercent}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-surface-container-lowest rounded-full overflow-hidden">
                        <div
                          className="h-full bg-tertiary-container rounded-full transition-all duration-500"
                          style={{ width: status.progressPercent + '%' }}
                        />
                      </div>
                      {/* Temps + time */}
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-label-sm text-on-surface-variant flex items-center gap-1">
                          <span className="material-symbols-outlined text-[13px]" aria-hidden="true">thermostat</span>
                          {status.nozzleTemp}°C nozzle
                        </span>
                        <span className="text-label-sm text-on-surface-variant flex items-center gap-1">
                          <span className="material-symbols-outlined text-[13px]" aria-hidden="true">bed</span>
                          {status.bedTemp}°C bed
                        </span>
                        <span className="text-label-sm text-on-surface-variant ml-auto">
                          {status.remainingMinutes}min left
                        </span>
                      </div>
                      {status.totalLayers > 0 && (
                        <p className="text-label-sm text-on-surface-variant">
                          Layer {status.layerNum} / {status.totalLayers}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Specs */}
                  <div className="flex flex-col gap-1.5 pt-1 border-t border-white/5">
                    <div className="flex items-center justify-between">
                      <span className="text-label-sm text-on-surface-variant">Power draw</span>
                      <span className="text-label-sm text-on-surface">{printer.powerConsumptionKw} kW</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-label-sm text-on-surface-variant">Electricity cost</span>
                      <span className="text-label-sm text-on-surface">₱{(printer.powerConsumptionKw * settings.electricityRatePerKwh).toFixed(2)}/hr</span>
                    </div>
                    {isOnline && status && (
                      <div className="flex items-center justify-between">
                        <span className="text-label-sm text-on-surface-variant">Last seen</span>
                        <span className="text-label-sm text-on-surface">
                          {Math.round((Date.now() - status.updatedAt) / 1000)}s ago
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-1">
                    <Button
                      variant="secondary"
                      icon="edit"
                      onClick={() => openEdit({ _id: printer._id as string, name: printer.name, powerConsumptionKw: printer.powerConsumptionKw })}
                      className="flex-1"
                    >
                      Edit
                    </Button>
                    <button
                      type="button"
                      aria-label={`Delete ${printer.name}`}
                      onClick={() => setDeletingId(printer._id as string)}
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-on-surface-variant hover:text-error hover:bg-white/5 transition-colors border border-white/10"
                    >
                      <span className="material-symbols-outlined text-[18px]" aria-hidden="true">delete</span>
                    </button>
                  </div>
                </GlassCard>
              )
            })}
          </div>
        )}
      </div>

      {/* Add Printer Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Add Printer"
        confirmLabel="Add Printer"
        onConfirm={handleAdd}
        isLoading={isSubmitting}
      >
        <PrinterForm form={form} errors={errors} onChange={handleFormChange} />
      </Modal>

      {/* Edit Printer Modal */}
      <Modal
        isOpen={!!editingId}
        onClose={() => setEditingId(null)}
        title="Edit Printer"
        confirmLabel="Save Changes"
        onConfirm={handleEdit}
        isLoading={isSubmitting}
      >
        <PrinterForm form={form} errors={errors} onChange={handleFormChange} />
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        title={`Delete ${deletingPrinter?.name ?? 'Printer'}?`}
        confirmLabel="Delete"
        confirmVariant="secondary"
        onConfirm={handleDelete}
        isLoading={isSubmitting}
      >
        <p className="text-body-md text-on-surface-variant">
          This will permanently remove <strong className="text-on-surface">{deletingPrinter?.name}</strong>. Jobs that reference this printer will keep their printer name but won't resolve to a live printer.
        </p>
      </Modal>
    </div>
  )
}

// ─── Shared form component ────────────────────────────────────────────────────

function PrinterForm({
  form,
  errors,
  onChange,
}: {
  form: PrinterFormData
  errors: FormErrors
  onChange: (field: keyof PrinterFormData, value: string) => void
}) {
  return (
    <div className="flex flex-col gap-4">
      <Input
        id="printer-name"
        label="Printer Name"
        value={form.name}
        onChange={e => onChange('name', e.target.value)}
        placeholder="e.g. Bambu A1"
        required
        error={errors.name}
      />
      <Input
        id="printer-power"
        label="Power Consumption (kW)"
        type="number"
        value={form.powerConsumptionKw}
        onChange={e => onChange('powerConsumptionKw', e.target.value)}
        placeholder="e.g. 0.35"
        required
        min={0}
        step={0.01}
        error={errors.powerConsumptionKw}
      />
      <div className="glass-card rounded-xl p-3 flex flex-col gap-1">
        <p className="text-label-sm text-on-surface-variant">Common values:</p>
        <div className="flex flex-wrap gap-2 mt-1">
          {[
            { label: 'Bambu A1', kw: '0.35' },
            { label: 'Bambu P1S', kw: '0.35' },
            { label: 'Ender 3', kw: '0.20' },
            { label: 'Resin (MSLA)', kw: '0.08' },
          ].map(({ label, kw }) => (
            <button
              key={label}
              type="button"
              onClick={() => onChange('powerConsumptionKw', kw)}
              className="text-label-sm text-primary bg-primary/10 hover:bg-primary/20 px-2 py-1 rounded-lg transition-colors"
            >
              {label} ({kw} kW)
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
