// Feature: print-os, Property 1: Pricing formula is complete and correct
// Feature: print-os, Property 2: Markup buffer scales final price monotonically
import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { calculatePrice, PricingInputs } from './pricingFormula'

const positiveFloat = fc.float({ min: Math.fround(0.01), max: Math.fround(1000), noNaN: true })
const nonNegativeFloat = fc.float({ min: Math.fround(0), max: Math.fround(100), noNaN: true })

const filamentInputs = fc.record({
  volumeCm3: positiveFloat,
  estimatedPrintTimeMin: positiveFloat,
  materialType: fc.constant('filament' as const),
  pricePerUnit: positiveFloat,
  density: positiveFloat,
  powerConsumptionKw: positiveFloat,
  electricityRatePerKwh: positiveFloat,
  markupBuffer: nonNegativeFloat,
})

const resinInputs = fc.record({
  volumeCm3: positiveFloat,
  estimatedPrintTimeMin: positiveFloat,
  materialType: fc.constant('resin' as const),
  pricePerUnit: positiveFloat,
  density: fc.constant(undefined as undefined),
  powerConsumptionKw: positiveFloat,
  electricityRatePerKwh: positiveFloat,
  markupBuffer: nonNegativeFloat,
})

describe('Property 1: Pricing formula is complete and correct', () => {
  it('filament: materialCost = volumeCm3 × density × pricePerUnit', () => {
    fc.assert(
      fc.property(filamentInputs, (inputs) => {
        const result = calculatePrice(inputs)
        const expected = inputs.volumeCm3 * (inputs.density ?? 1.24) * inputs.pricePerUnit
        expect(result.materialCost).toBeCloseTo(expected, 8)
      }),
      { numRuns: 100 }
    )
  })

  it('resin: materialCost = volumeCm3 × pricePerUnit', () => {
    fc.assert(
      fc.property(resinInputs, (inputs) => {
        const result = calculatePrice(inputs)
        const expected = inputs.volumeCm3 * inputs.pricePerUnit
        expect(result.materialCost).toBeCloseTo(expected, 8)
      }),
      { numRuns: 100 }
    )
  })

  it('electricityCost = (printTimeMin / 60) × powerKw × ratePerKwh', () => {
    fc.assert(
      fc.property(fc.oneof(filamentInputs, resinInputs), (inputs) => {
        const result = calculatePrice(inputs)
        const expected =
          (inputs.estimatedPrintTimeMin / 60) *
          inputs.powerConsumptionKw *
          inputs.electricityRatePerKwh
        expect(result.electricityCost).toBeCloseTo(expected, 8)
      }),
      { numRuns: 100 }
    )
  })

  it('subtotal = materialCost + electricityCost', () => {
    fc.assert(
      fc.property(fc.oneof(filamentInputs, resinInputs), (inputs) => {
        const result = calculatePrice(inputs)
        expect(result.subtotal).toBeCloseTo(
          result.materialCost + result.electricityCost,
          8
        )
      }),
      { numRuns: 100 }
    )
  })

  it('finalPrice = subtotal × (1 + markupBuffer / 100)', () => {
    fc.assert(
      fc.property(fc.oneof(filamentInputs, resinInputs), (inputs) => {
        const result = calculatePrice(inputs)
        expect(result.finalPrice).toBeCloseTo(
          result.subtotal * (1 + inputs.markupBuffer / 100),
          8
        )
      }),
      { numRuns: 100 }
    )
  })

  it('is deterministic: same inputs produce same outputs', () => {
    fc.assert(
      fc.property(fc.oneof(filamentInputs, resinInputs), (inputs) => {
        const r1 = calculatePrice(inputs)
        const r2 = calculatePrice(inputs)
        expect(r1).toEqual(r2)
      }),
      { numRuns: 100 }
    )
  })
})

describe('Property 2: Markup buffer scales final price monotonically', () => {
  it('higher markup always produces higher final price', () => {
    const twoMarkups = fc.tuple(nonNegativeFloat, nonNegativeFloat).filter(
      ([a, b]) => b > a + 0.001
    )
    fc.assert(
      fc.property(
        fc.oneof(filamentInputs, resinInputs),
        twoMarkups,
        (inputs, [a, b]) => {
          const priceA = calculatePrice({ ...inputs, markupBuffer: a }).finalPrice
          const priceB = calculatePrice({ ...inputs, markupBuffer: b }).finalPrice
          expect(priceB).toBeGreaterThan(priceA)
        }
      ),
      { numRuns: 100 }
    )
  })
})
