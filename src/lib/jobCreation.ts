// Feature: print-os — Job creation pure logic

export interface NewJobInputs {
  clientName: string
  materialId: string
  layerHeight: number
  printerId: string
  estimatedPrintTime: number
  estimatedVolumeCm3: number
  quotedPrice?: number
  materialUsedGrams?: number
  materialUsedMl?: number
}

export interface NewJobDocument {
  jobNumber: string
  clientName: string
  materialId: string
  layerHeight: number
  printerId: string
  estimatedPrintTime: number
  estimatedVolumeCm3: number
  quotedPrice?: number
  materialUsedGrams?: number
  materialUsedMl?: number
  stage: 'Pending'
  createdAt: number
}

export function validateNewJobInputs(inputs: NewJobInputs): string[] {
  const errors: string[] = []
  if (!inputs.clientName.trim()) errors.push('Client name is required.')
  if (!inputs.materialId) errors.push('Material is required.')
  if (!inputs.printerId) errors.push('Printer is required.')
  if (inputs.layerHeight <= 0) errors.push('Layer height must be greater than 0.')
  if (inputs.estimatedPrintTime <= 0) errors.push('Estimated print time must be greater than 0.')
  if (inputs.estimatedVolumeCm3 <= 0) errors.push('Estimated volume must be greater than 0.')
  return errors
}

export function buildNewJob(inputs: NewJobInputs, jobNumber: string): NewJobDocument {
  return {
    jobNumber,
    clientName: inputs.clientName,
    materialId: inputs.materialId,
    layerHeight: inputs.layerHeight,
    printerId: inputs.printerId,
    estimatedPrintTime: inputs.estimatedPrintTime,
    estimatedVolumeCm3: inputs.estimatedVolumeCm3,
    quotedPrice: inputs.quotedPrice,
    materialUsedGrams: inputs.materialUsedGrams,
    materialUsedMl: inputs.materialUsedMl,
    stage: 'Pending',
    createdAt: Date.now(),
  }
}
