// Feature: print-os, Property 3: Inventory deduction conserves stock correctly
// Feature: print-os, Property 4: Low-stock alert is consistent with threshold at all times
import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { deductStock, isLowStock, lowStockCount } from './inventoryLogic'

const nonNegativeFloat = fc.float({ min: Math.fround(0), max: Math.fround(10000), noNaN: true })

describe('Property 3: Inventory deduction conserves stock correctly', () => {
  it('deductStock returns stockLevel - amount for valid inputs', () => {
    fc.assert(
      fc.property(
        nonNegativeFloat,
        nonNegativeFloat,
        (stockLevel, amount) => {
          fc.pre(amount <= stockLevel)
          const result = deductStock(stockLevel, amount)
          expect(result).toBeCloseTo(stockLevel - amount, 8)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('deductStock throws when amount exceeds stockLevel', () => {
    fc.assert(
      fc.property(
        nonNegativeFloat,
        fc.float({ min: Math.fround(0.001), max: Math.fround(10000), noNaN: true }),
        (stockLevel, extra) => {
          const amount = stockLevel + extra
          expect(() => deductStock(stockLevel, amount)).toThrow()
        }
      ),
      { numRuns: 100 }
    )
  })
})

describe('Property 4: Low-stock alert is consistent with threshold at all times', () => {
  it('isLowStock returns true iff stockLevel <= threshold', () => {
    fc.assert(
      fc.property(nonNegativeFloat, nonNegativeFloat, (stockLevel, threshold) => {
        expect(isLowStock(stockLevel, threshold)).toBe(stockLevel <= threshold)
      }),
      { numRuns: 100 }
    )
  })

  it('lowStockCount equals count of materials where stockLevel <= threshold', () => {
    const materialList = fc.array(
      fc.record({
        stockLevel: nonNegativeFloat,
        lowStockThreshold: nonNegativeFloat,
      }),
      { minLength: 0, maxLength: 20 }
    )
    fc.assert(
      fc.property(materialList, (materials) => {
        const expected = materials.filter(
          (m) => m.stockLevel <= m.lowStockThreshold
        ).length
        expect(lowStockCount(materials)).toBe(expected)
      }),
      { numRuns: 100 }
    )
  })
})
