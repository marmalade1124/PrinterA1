// Feature: print-os, Property 5: Stage transitions respect the defined ordering
import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { advanceStageLogic, isBackwardTransition, STAGE_ORDER } from './stageTransitions'
import type { JobStage } from '../types/index'

// All stages except the last (can be advanced)
const advanceableStage = fc.constantFrom(
  ...STAGE_ORDER.slice(0, -1) as JobStage[]
)

// Any valid stage
const anyStage = fc.constantFrom(...STAGE_ORDER as unknown as JobStage[])

describe('Property 5: Stage transitions respect the defined ordering', () => {
  it('advanceStageLogic returns the immediately next stage', () => {
    fc.assert(
      fc.property(advanceableStage, (stage) => {
        const next = advanceStageLogic(stage)
        const currentIdx = STAGE_ORDER.indexOf(stage)
        const nextIdx = STAGE_ORDER.indexOf(next)
        expect(nextIdx).toBe(currentIdx + 1)
      }),
      { numRuns: 100 }
    )
  })

  it('result never precedes the input stage', () => {
    fc.assert(
      fc.property(advanceableStage, (stage) => {
        const next = advanceStageLogic(stage)
        expect(STAGE_ORDER.indexOf(next)).toBeGreaterThan(STAGE_ORDER.indexOf(stage))
      }),
      { numRuns: 100 }
    )
  })

  it('throws when called on the final stage', () => {
    expect(() => advanceStageLogic('Ready for Pickup')).toThrow()
  })

  it('isBackwardTransition correctly identifies backward moves', () => {
    fc.assert(
      fc.property(anyStage, anyStage, (from, to) => {
        const result = isBackwardTransition(from, to)
        const expected = STAGE_ORDER.indexOf(to) < STAGE_ORDER.indexOf(from)
        expect(result).toBe(expected)
      }),
      { numRuns: 100 }
    )
  })
})
