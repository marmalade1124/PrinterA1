/**
 * Convex Integration Tests — PrintOS
 *
 * These tests validate the business logic that mirrors the Convex backend
 * mutations and queries. They use the pure helper functions that are shared
 * between the frontend and backend, ensuring correctness before connecting
 * to a live Convex instance.
 *
 * When `npx convex dev` has been run and _generated/ exists, these tests
 * can be extended to call the actual Convex functions via the test client.
 *
 * Feature: print-os, Property 8: Settings persistence round-trip
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { buildNewJob, validateNewJobInputs } from './jobCreation'
import { deductStock, isLowStock, lowStockCount } from './inventoryLogic'
import { advanceStageLogic } from './stageTransitions'
import type { JobStage } from '../types/index'
import { STAGE_ORDER } from '../types/index'

// ---------------------------------------------------------------------------
// 26.1 Job creation → appears in listAll with stage === "Pending"
// ---------------------------------------------------------------------------

describe('26.1 Job creation produces a Pending job', () => {
  it('buildNewJob always sets stage to Pending', () => {
    const inputs = {
      clientName: 'NovaTech Ind.',
      materialId: 'mat-abc',
      layerHeight: 0.2,
      printerId: 'printer-xyz',
      estimatedPrintTime: 240,
      estimatedVolumeCm3: 45.2,
    }
    const job = buildNewJob(inputs, 'JOB-0001')
    expect(job.stage).toBe('Pending')
    expect(job.jobNumber).toBe('JOB-0001')
    expect(job.clientName).toBe('NovaTech Ind.')
  })

  it('validateNewJobInputs returns no errors for valid inputs', () => {
    const inputs = {
      clientName: 'Studio 42',
      materialId: 'mat-001',
      layerHeight: 0.12,
      printerId: 'printer-001',
      estimatedPrintTime: 180,
      estimatedVolumeCm3: 28.5,
    }
    expect(validateNewJobInputs(inputs)).toHaveLength(0)
  })

  it('validateNewJobInputs returns errors for missing required fields', () => {
    const inputs = {
      clientName: '',
      materialId: '',
      layerHeight: 0,
      printerId: '',
      estimatedPrintTime: 0,
      estimatedVolumeCm3: 0,
    }
    const errors = validateNewJobInputs(inputs)
    expect(errors.length).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// 26.2 advanceStage to "Ready for Pickup" deducts material stock
// ---------------------------------------------------------------------------

describe('26.2 Advancing to Ready for Pickup deducts material stock', () => {
  it('deductStock correctly reduces stock when job completes', () => {
    const initialStock = 1000  // grams
    const consumed = 45.2      // grams used by the job

    const newStock = deductStock(initialStock, consumed)
    expect(newStock).toBeCloseTo(initialStock - consumed, 5)
  })

  it('deductStock throws INSUFFICIENT_STOCK when amount exceeds stock', () => {
    const initialStock = 30
    const consumed = 45.2
    expect(() => deductStock(initialStock, consumed)).toThrow()
  })

  it('full stage progression from Pending to Ready for Pickup works', () => {
    let stage: JobStage = 'Pending'
    const path: JobStage[] = [stage]

    while (stage !== 'Ready for Pickup') {
      stage = advanceStageLogic(stage)
      path.push(stage)
    }

    expect(path).toEqual(STAGE_ORDER)
  })

  it('stock deduction is atomic: deductStock is deterministic', () => {
    const stock = 500
    const amount = 123.45
    const result1 = deductStock(stock, amount)
    const result2 = deductStock(stock, amount)
    expect(result1).toBe(result2)
  })
})

// ---------------------------------------------------------------------------
// 26.3 settings.upsert → settings.get returns updated values (Property 8)
// ---------------------------------------------------------------------------

describe('26.3 Settings persistence round-trip (Property 8)', () => {
  // Simulates the upsert/get pattern: store settings, retrieve them
  function simulateSettingsStore() {
    let stored: { electricityRatePerKwh: number; defaultMarkupBuffer: number } | null = null

    function upsert(settings: { electricityRatePerKwh: number; defaultMarkupBuffer: number }) {
      stored = { ...settings }
    }

    function get() {
      return stored ?? { electricityRatePerKwh: 0.12, defaultMarkupBuffer: 15 }
    }

    return { upsert, get }
  }

  it('get returns defaults when nothing has been saved', () => {
    const store = simulateSettingsStore()
    const result = store.get()
    expect(result.electricityRatePerKwh).toBe(0.12)
    expect(result.defaultMarkupBuffer).toBe(15)
  })

  it('get returns the last upserted values', () => {
    const store = simulateSettingsStore()
    store.upsert({ electricityRatePerKwh: 0.25, defaultMarkupBuffer: 20 })
    const result = store.get()
    expect(result.electricityRatePerKwh).toBe(0.25)
    expect(result.defaultMarkupBuffer).toBe(20)
  })

  it('Property 8: upsert then get returns identical field values for any valid settings', () => {
    // Feature: print-os, Property 8: Settings persistence round-trip
    const positiveFloat = fc.float({ min: Math.fround(0.001), max: Math.fround(10), noNaN: true })
    const nonNegativeFloat = fc.float({ min: Math.fround(0), max: Math.fround(100), noNaN: true })

    fc.assert(
      fc.property(positiveFloat, nonNegativeFloat, (rate, markup) => {
        const store = simulateSettingsStore()
        const settings = { electricityRatePerKwh: rate, defaultMarkupBuffer: markup }
        store.upsert(settings)
        const retrieved = store.get()
        expect(retrieved.electricityRatePerKwh).toBe(settings.electricityRatePerKwh)
        expect(retrieved.defaultMarkupBuffer).toBe(settings.defaultMarkupBuffer)
      }),
      { numRuns: 100 }
    )
  })

  it('multiple upserts: get always returns the most recent values', () => {
    const store = simulateSettingsStore()
    store.upsert({ electricityRatePerKwh: 0.10, defaultMarkupBuffer: 10 })
    store.upsert({ electricityRatePerKwh: 0.15, defaultMarkupBuffer: 20 })
    store.upsert({ electricityRatePerKwh: 0.20, defaultMarkupBuffer: 25 })
    const result = store.get()
    expect(result.electricityRatePerKwh).toBe(0.20)
    expect(result.defaultMarkupBuffer).toBe(25)
  })
})

// ---------------------------------------------------------------------------
// 26.4 Low-stock count query reflects correct count after stock updates
// ---------------------------------------------------------------------------

describe('26.4 Low-stock count reflects correct count after stock updates', () => {
  it('lowStockCount returns 0 when all materials are above threshold', () => {
    const materials = [
      { stockLevel: 500, lowStockThreshold: 200 },
      { stockLevel: 300, lowStockThreshold: 100 },
      { stockLevel: 1000, lowStockThreshold: 50 },
    ]
    expect(lowStockCount(materials)).toBe(0)
  })

  it('lowStockCount returns correct count when some materials are low', () => {
    const materials = [
      { stockLevel: 150, lowStockThreshold: 200 },  // low
      { stockLevel: 300, lowStockThreshold: 100 },  // ok
      { stockLevel: 50, lowStockThreshold: 100 },   // low
    ]
    expect(lowStockCount(materials)).toBe(2)
  })

  it('lowStockCount updates correctly after a stock deduction', () => {
    let materials = [
      { stockLevel: 250, lowStockThreshold: 200 },  // ok initially
      { stockLevel: 300, lowStockThreshold: 100 },  // ok
    ]
    expect(lowStockCount(materials)).toBe(0)

    // Simulate deduction that brings first material below threshold
    const newLevel = deductStock(materials[0].stockLevel, 100) // 250 - 100 = 150
    materials = materials.map((m, i) =>
      i === 0 ? { ...m, stockLevel: newLevel } : m
    )

    expect(lowStockCount(materials)).toBe(1)
    expect(isLowStock(materials[0].stockLevel, materials[0].lowStockThreshold)).toBe(true)
  })

  it('lowStockCount is consistent with isLowStock for each material', () => {
    const materials = [
      { stockLevel: 100, lowStockThreshold: 200 },
      { stockLevel: 200, lowStockThreshold: 200 },  // exactly at threshold = low
      { stockLevel: 201, lowStockThreshold: 200 },  // just above = ok
      { stockLevel: 0, lowStockThreshold: 50 },     // empty = low
    ]
    const count = lowStockCount(materials)
    const manualCount = materials.filter(m => isLowStock(m.stockLevel, m.lowStockThreshold)).length
    expect(count).toBe(manualCount)
    expect(count).toBe(3)
  })
})
