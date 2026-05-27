import { useState, useEffect } from 'react'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { Input } from '../ui/Input'
import { isLowStock } from '../../lib/inventoryLogic'

export interface MaterialItem {
  _id: string
  name: string
  type: 'filament' | 'resin'
  pricePerUnit: number
  stockLevel: number
  lowStockThreshold: number
  density?: number
}

interface MaterialRowProps {
  material: MaterialItem
  onUpdateStock: (materialId: string, newLevel: number) => Promise<void>
  onUpdateThreshold: (materialId: string, threshold: number) => Promise<void>
  onUpdateDetails: (materialId: string, data: { name: string; type: 'filament' | 'resin'; pricePerUnit: number; density?: number }) => Promise<void>
  onDelete: (materialId: string) => Promise<void>
}

const UNIT: Record<'filament' | 'resin', string> = { filament: 'g', resin: 'ml' }

const selectClass = 'w-full rounded-lg px-3 py-2.5 bg-surface-container border border-outline-variant text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-body-md'

export function MaterialRow({ material, onUpdateStock, onUpdateThreshold, onUpdateDetails, onDelete }: MaterialRowProps) {
  const [stockInput, setStockInput] = useState(String(material.stockLevel))
  const [thresholdInput, setThresholdInput] = useState(String(material.lowStockThreshold))
  const [isSavingStock, setIsSavingStock] = useState(false)
  const [isSavingThreshold, setIsSavingThreshold] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // Edit form state
  const [editName, setEditName] = useState(material.name)
  const [editType, setEditType] = useState<'filament' | 'resin'>(material.type)
  const [editPrice, setEditPrice] = useState(String(material.pricePerUnit))
  const [editDensity, setEditDensity] = useState(material.density != null ? String(material.density) : '')

  // Fix 10: Sync inputs when props change (e.g. from another session)
  useEffect(() => { setStockInput(String(material.stockLevel)) }, [material.stockLevel])
  useEffect(() => { setThresholdInput(String(material.lowStockThreshold)) }, [material.lowStockThreshold])

  const unit = UNIT[material.type]
  const lowStock = isLowStock(material.stockLevel, material.lowStockThreshold)

  async function handleSaveStock() {
    const newLevel = parseFloat(stockInput)
    if (isNaN(newLevel) || newLevel < 0) return
    setIsSavingStock(true)
    try { await onUpdateStock(material._id, newLevel) } finally { setIsSavingStock(false) }
  }

  async function handleSaveThreshold() {
    const threshold = parseFloat(thresholdInput)
    if (isNaN(threshold) || threshold < 0) return
    setIsSavingThreshold(true)
    try { await onUpdateThreshold(material._id, threshold) } finally { setIsSavingThreshold(false) }
  }

  async function handleSaveEdit() {
    const price = parseFloat(editPrice)
    if (!editName.trim() || isNaN(price) || price <= 0) return
    setIsSavingEdit(true)
    try {
      await onUpdateDetails(material._id, {
        name: editName.trim(),
        type: editType,
        pricePerUnit: price,
        density: editType === 'filament' && editDensity ? parseFloat(editDensity) : undefined,
      })
      setShowEditModal(false)
    } finally { setIsSavingEdit(false) }
  }

  async function handleDelete() {
    setIsDeleting(true)
    setDeleteError(null)
    try {
      await onDelete(material._id)
      setShowDeleteModal(false)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete material.'
      setDeleteError(msg.includes('MATERIAL_IN_USE') ? 'This material is used by active jobs and cannot be deleted.' : msg)
    } finally { setIsDeleting(false) }
  }

  return (
    <>
      <div className="glass-card rounded-xl p-4 flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-body-md text-on-surface font-medium">{material.name}</span>
            <Badge variant="status">{material.type}</Badge>
            {lowStock && (
              <Badge variant="alert">
                <span className="material-symbols-outlined text-[12px] mr-0.5" aria-hidden="true">warning</span>
                Low Stock
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              type="button"
              aria-label={`Edit ${material.name}`}
              onClick={() => {
                setEditName(material.name)
                setEditType(material.type)
                setEditPrice(String(material.pricePerUnit))
                setEditDensity(material.density != null ? String(material.density) : '')
                setShowEditModal(true)
              }}
              className="text-on-surface-variant hover:text-primary transition-colors p-1 rounded min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">edit</span>
            </button>
            <button
              type="button"
              aria-label={`Delete ${material.name}`}
              onClick={() => setShowDeleteModal(true)}
              className="text-on-surface-variant hover:text-error transition-colors p-1 rounded min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">delete</span>
            </button>
          </div>
        </div>

        <p className="text-label-sm text-on-surface-variant">
          ₱{material.pricePerUnit.toFixed(3)} / {unit}
          {material.density != null && ` · density ${material.density} g/cm³`}
        </p>

        {/* Stock level */}
        <div className="flex items-end gap-2">
          <div className="flex flex-col gap-1 flex-1">
            <label htmlFor={`stock-${material._id}`} className="text-label-sm text-on-surface-variant">Stock Level ({unit})</label>
            <input id={`stock-${material._id}`} type="number" value={stockInput} onChange={e => setStockInput(e.target.value)} min={0} step={1}
              className="w-full rounded-lg px-3 py-2 bg-surface-container border border-outline-variant text-on-surface text-body-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
              aria-label={`Stock level for ${material.name} in ${unit}`} />
          </div>
          <Button variant="secondary" onClick={handleSaveStock} disabled={isSavingStock} className="flex-shrink-0">
            {isSavingStock ? 'Saving…' : 'Save'}
          </Button>
        </div>

        {/* Threshold */}
        <div className="flex items-end gap-2">
          <div className="flex flex-col gap-1 flex-1">
            <label htmlFor={`threshold-${material._id}`} className="text-label-sm text-on-surface-variant">Alert Threshold ({unit})</label>
            <input id={`threshold-${material._id}`} type="number" value={thresholdInput} onChange={e => setThresholdInput(e.target.value)} min={0} step={1}
              className="w-full rounded-lg px-3 py-2 bg-surface-container border border-outline-variant text-on-surface text-body-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
              aria-label={`Alert threshold for ${material.name} in ${unit}`} />
          </div>
          <Button variant="secondary" onClick={handleSaveThreshold} disabled={isSavingThreshold} className="flex-shrink-0">
            {isSavingThreshold ? 'Saving…' : 'Set'}
          </Button>
        </div>
      </div>

      {/* Edit modal */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title={`Edit ${material.name}`} confirmLabel="Save Changes" onConfirm={handleSaveEdit} isLoading={isSavingEdit}>
        <div className="flex flex-col gap-4">
          <Input id={`edit-name-${material._id}`} label="Material Name" value={editName} onChange={e => setEditName(e.target.value)} required />
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`edit-type-${material._id}`} className="text-label-md text-on-surface-variant">Type</label>
            <select id={`edit-type-${material._id}`} value={editType} onChange={e => setEditType(e.target.value as 'filament' | 'resin')} className={selectClass}>
              <option value="filament">Filament (grams)</option>
              <option value="resin">Resin (ml)</option>
            </select>
          </div>
          <Input id={`edit-price-${material._id}`} label={`Price per ${editType === 'resin' ? 'ml' : 'g'} (₱)`} type="number" value={editPrice} onChange={e => setEditPrice(e.target.value)} min={0} step={0.001} required />
          {editType === 'filament' && (
            <Input id={`edit-density-${material._id}`} label="Density (g/cm³) — optional" type="number" value={editDensity} onChange={e => setEditDensity(e.target.value)} placeholder="e.g. 1.24" min={0} step={0.01} />
          )}
        </div>
      </Modal>

      {/* Delete modal */}
      <Modal isOpen={showDeleteModal} onClose={() => { setShowDeleteModal(false); setDeleteError(null) }} title={`Delete ${material.name}?`} confirmLabel="Delete" confirmVariant="secondary" onConfirm={handleDelete} isLoading={isDeleting}>
        <p className="text-body-md text-on-surface-variant">
          This will permanently remove <strong className="text-on-surface">{material.name}</strong> and all its stock data. This action cannot be undone.
        </p>
        {deleteError && <p role="alert" className="text-label-sm text-error mt-3">{deleteError}</p>}
      </Modal>
    </>
  )
}
