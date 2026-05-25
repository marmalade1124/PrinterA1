// Feature: print-os — Inventory deduction and low-stock pure logic

export function deductStock(stockLevel: number, amount: number): number {
  const result = stockLevel - amount
  if (result < 0) {
    throw new Error(`Insufficient stock: cannot deduct ${amount} from ${stockLevel}`)
  }
  return result
}

export function isLowStock(stockLevel: number, threshold: number): boolean {
  return stockLevel <= threshold
}

export function lowStockCount(
  materials: Array<{ stockLevel: number; lowStockThreshold: number }>
): number {
  return materials.filter((m) => isLowStock(m.stockLevel, m.lowStockThreshold)).length
}
