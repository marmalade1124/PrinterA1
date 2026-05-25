import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  jobs: defineTable({
    jobNumber: v.string(),           // e.g. "JOB-0042"
    clientName: v.string(),
    materialId: v.id("materials"),
    layerHeight: v.number(),         // mm
    printerId: v.id("printers"),
    stage: v.union(
      v.literal("Pending"),
      v.literal("Slicing"),
      v.literal("Printing"),
      v.literal("Post-Processing"),
      v.literal("Ready for Pickup"),
    ),
    estimatedPrintTime: v.number(),  // minutes
    estimatedVolumeCm3: v.number(),  // cm³
    materialUsedGrams: v.optional(v.number()),   // filament jobs
    materialUsedMl: v.optional(v.number()),      // resin jobs
    quotedPrice: v.optional(v.number()),         // final quoted price
    createdAt: v.number(),           // Unix ms
    startedPrintingAt: v.optional(v.number()),   // Unix ms, set when → Printing
  })
    .index("by_stage", ["stage"])
    .index("by_createdAt", ["createdAt"]),

  materials: defineTable({
    name: v.string(),
    type: v.union(v.literal("filament"), v.literal("resin")),
    pricePerUnit: v.number(),        // per gram (filament) or per ml (resin)
    density: v.optional(v.number()), // g/cm³, filament only
    stockLevel: v.number(),          // grams or ml
    lowStockThreshold: v.number(),   // grams or ml
  })
    .index("by_name", ["name"]),

  printerStatus: defineTable({
    serialNumber: v.string(),
    printerName: v.string(),
    gcodeState: v.string(),       // IDLE | RUNNING | PAUSE | FINISH | FAILED | OFFLINE
    progressPercent: v.number(),  // 0-100
    remainingMinutes: v.number(),
    gcodeFile: v.string(),
    nozzleTemp: v.number(),
    bedTemp: v.number(),
    layerNum: v.number(),
    totalLayers: v.number(),
    updatedAt: v.number(),        // Unix ms
  })
    .index("by_serial", ["serialNumber"]),

  materialUsageLog: defineTable({
    jobId: v.id("jobs"),
    jobNumber: v.string(),
    clientName: v.string(),
    materialId: v.id("materials"),
    materialName: v.string(),
    materialType: v.union(v.literal("filament"), v.literal("resin")),
    amountUsed: v.number(),          // grams or ml
    costOfMaterial: v.number(),      // ₱ cost of material used
    quotedPrice: v.optional(v.number()),
    completedAt: v.number(),         // Unix ms
  })
    .index("by_completedAt", ["completedAt"])
    .index("by_materialId", ["materialId"]),

  printers: defineTable({
    name: v.string(),
    powerConsumptionKw: v.number(),
  }),

  settings: defineTable({
    key: v.literal("singleton"),     // enforces single document
    electricityRatePerKwh: v.number(),
    defaultMarkupBuffer: v.number(), // percentage, e.g. 15 = 15%
    clientHourlyRate: v.optional(v.number()), // ₱ per hour charged to client
  })
    .index("by_key", ["key"]),
});
