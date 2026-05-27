import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { MaterialList } from '../components/inventory/MaterialList'
import { AddMaterialForm } from '../components/inventory/AddMaterialForm'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { useToast } from '../components/ui/Toast'
import { lowStockCount } from '../lib/inventoryLogic'
import type { MaterialItem } from '../components/inventory/MaterialRow'
import type { Id } from '../../convex/_generated/dataModel'

export default function InventoryPage() {
  const rawMaterials = useQuery(api.materials.listAll) ?? []
  const updateStock = useMutation(api.materials.updateStock)
  const updateThreshold = useMutation(api.materials.updateThreshold)
  const updateDetails = useMutation(api.materials.update)
  const removeMaterial = useMutation(api.materials.remove)
  const createMaterial = useMutation(api.materials.create)

  const { showToast } = useToast()
  const [isAddOpen, setIsAddOpen] = useState(false)

  // Shape for UI components
  const materials: MaterialItem[] = rawMaterials.map(m => ({
    _id: m._id as string,
    name: m.name,
    type: m.type,
    pricePerUnit: m.pricePerUnit,
    density: m.density,
    stockLevel: m.stockLevel,
    lowStockThreshold: m.lowStockThreshold,
  }))

  const alertCount = lowStockCount(materials)

  async function handleUpdateStock(materialId: string, newLevel: number) {
    await updateStock({ materialId: materialId as Id<'materials'>, newLevel })
    showToast('Stock level updated.', 'success')
  }

  async function handleUpdateThreshold(materialId: string, threshold: number) {
    await updateThreshold({ materialId: materialId as Id<'materials'>, threshold })
    showToast('Alert threshold updated.', 'success')
  }

  async function handleUpdateDetails(materialId: string, data: { name: string; type: 'filament' | 'resin'; pricePerUnit: number; density?: number }) {
    await updateDetails({ materialId: materialId as Id<'materials'>, ...data })
    showToast('Material updated.', 'success')
  }

  async function handleDelete(materialId: string) {
    await removeMaterial({ materialId: materialId as Id<'materials'> })
    showToast('Material deleted.', 'success')
  }

  async function handleAddMaterial(data: Omit<MaterialItem, '_id'>) {
    await createMaterial({
      name: data.name,
      type: data.type,
      pricePerUnit: data.pricePerUnit,
      density: data.density,
      stockLevel: data.stockLevel,
      lowStockThreshold: data.lowStockThreshold,
    })
    showToast(`${data.name} added to inventory.`, 'success')
  }

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="flex-shrink-0 px-8 pt-6 pb-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-headline-lg text-on-surface font-semibold">Inventory</h1>
              {alertCount > 0 && (
                <Badge variant="alert">
                  <span className="material-symbols-outlined text-[12px] mr-1" aria-hidden="true">warning</span>
                  {alertCount} low stock
                </Badge>
              )}
            </div>
            <p className="text-body-md text-on-surface-variant mt-0.5">Track filament and resin stock levels.</p>
          </div>
          <Button variant="primary" icon="add" onClick={() => setIsAddOpen(true)}>
            Add Material
          </Button>
        </div>
      </div>

      <div className="flex-1 px-8 pb-8">
        <div className="max-w-2xl mx-auto">
          <MaterialList
            materials={materials}
            onUpdateStock={handleUpdateStock}
            onUpdateThreshold={handleUpdateThreshold}
            onUpdateDetails={handleUpdateDetails}
            onDelete={handleDelete}
          />
        </div>
      </div>

      <AddMaterialForm
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSubmit={handleAddMaterial}
      />
    </div>
  )
}
