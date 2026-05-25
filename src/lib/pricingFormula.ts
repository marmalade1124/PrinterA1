// Feature: print-os — Pricing formula pure calculation library

export interface PricingInputs {
  volumeCm3: number
  estimatedPrintTimeMin: number
  materialType: 'filament' | 'resin'
  pricePerUnit: number        // per gram (filament) or per ml (resin)
  density?: number            // g/cm³, required for filament
  powerConsumptionKw: number
  electricityRatePerKwh: number  // actual electricity cost rate (e.g. ₱10.5886)
  clientHourlyRate: number    // ₱ per hour charged to client for print time
  markupBuffer: number        // percentage, e.g. 15 = 15%
}

export interface PricingResult {
  materialCost: number
  electricityCost: number     // your actual electricity cost
  printTimeCost: number       // client charge for print time (hourlyRate × hours)
  subtotal: number
  markupAmount: number
  finalPrice: number
}

export function calculatePrice(inputs: PricingInputs): PricingResult {
  const {
    volumeCm3,
    estimatedPrintTimeMin,
    materialType,
    pricePerUnit,
    density,
    powerConsumptionKw,
    electricityRatePerKwh,
    clientHourlyRate,
    markupBuffer,
  } = inputs

  const printTimeHours = estimatedPrintTimeMin / 60

  // Material cost
  let materialCost: number
  if (materialType === 'filament') {
    const d = density ?? 1.24 // default PLA density g/cm³
    materialCost = volumeCm3 * d * pricePerUnit
  } else {
    materialCost = volumeCm3 * pricePerUnit
  }

  // Your actual electricity cost (internal)
  const electricityCost = printTimeHours * powerConsumptionKw * electricityRatePerKwh

  // Client print time charge (₱50/hr × hours)
  const printTimeCost = printTimeHours * clientHourlyRate

  const subtotal = materialCost + electricityCost + printTimeCost
  const markupAmount = subtotal * (markupBuffer / 100)
  const finalPrice = subtotal * (1 + markupBuffer / 100)

  return { materialCost, electricityCost, printTimeCost, subtotal, markupAmount, finalPrice }
}
