import { MaterialRow, MaterialItem } from './MaterialRow'

interface MaterialListProps {
  materials: MaterialItem[]
  onUpdateStock: (materialId: string, newLevel: number) => Promise<void>
  onUpdateThreshold: (materialId: string, threshold: number) => Promise<void>
  onDelete: (materialId: string) => Promise<void>
}

export function MaterialList({ materials, onUpdateStock, onUpdateThreshold, onDelete }: MaterialListProps) {
  if (materials.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[200px] rounded-xl border border-dashed border-outline-variant p-8 text-center gap-3">
        <span className="material-symbols-outlined text-[40px] text-on-surface-variant opacity-40" aria-hidden="true">
          inventory_2
        </span>
        <p className="text-body-md text-on-surface-variant opacity-60">
          No materials yet. Add your first material to get started.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3" role="list" aria-label="Materials inventory">
      {materials.map(material => (
        <div key={material._id} role="listitem">
          <MaterialRow
            material={material}
            onUpdateStock={onUpdateStock}
            onUpdateThreshold={onUpdateThreshold}
            onDelete={onDelete}
          />
        </div>
      ))}
    </div>
  )
}
