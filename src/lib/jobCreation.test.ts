// Feature: print-os, Property 6: Job creation always produces a Pending job with all required fields
import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { buildNewJob, validateNewJobInputs, NewJobInputs } from './jobCreation'

const validInputs = fc.record({
  clientName: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
  materialId: fc.string({ minLength: 1 }),
  layerHeight: fc.float({ min: Math.fround(0.01), max: Math.fround(1.0), noNaN: true }),
  printerId: fc.string({ minLength: 1 }),
  estimatedPrintTime: fc.float({ min: Math.fround(0.1), max: Math.fround(10000), noNaN: true }),
  estimatedVolumeCm3: fc.float({ min: Math.fround(0.01), max: Math.fround(10000), noNaN: true }),
})

describe('Property 6: Job creation always produces a Pending job with all required fields', () => {
  it('buildNewJob always sets stage to Pending', () => {
    fc.assert(
      fc.property(validInputs, fc.string({ minLength: 1 }), (inputs, jobNumber) => {
        const job = buildNewJob(inputs, jobNumber)
        expect(job.stage).toBe('Pending')
      }),
      { numRuns: 100 }
    )
  })

  it('buildNewJob preserves all input fields exactly', () => {
    fc.assert(
      fc.property(validInputs, fc.string({ minLength: 1 }), (inputs, jobNumber) => {
        const job = buildNewJob(inputs, jobNumber)
        expect(job.clientName).toBe(inputs.clientName)
        expect(job.materialId).toBe(inputs.materialId)
        expect(job.layerHeight).toBe(inputs.layerHeight)
        expect(job.printerId).toBe(inputs.printerId)
        expect(job.estimatedPrintTime).toBe(inputs.estimatedPrintTime)
        expect(job.estimatedVolumeCm3).toBe(inputs.estimatedVolumeCm3)
        expect(job.jobNumber).toBe(jobNumber)
        expect(job.jobNumber.length).toBeGreaterThan(0)
      }),
      { numRuns: 100 }
    )
  })

  it('validateNewJobInputs returns empty array for valid inputs', () => {
    fc.assert(
      fc.property(validInputs, (inputs) => {
        const errors = validateNewJobInputs(inputs)
        expect(errors).toHaveLength(0)
      }),
      { numRuns: 100 }
    )
  })
})
