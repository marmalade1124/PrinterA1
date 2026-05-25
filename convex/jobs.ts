import { query, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
const STAGE_ORDER = [
  "Pending",
  "Slicing",
  "Printing",
  "Post-Processing",
  "Ready for Pickup",
] as const;

type JobStage = (typeof STAGE_ORDER)[number];

function getNextStage(current: JobStage): JobStage | null {
  const idx = STAGE_ORDER.indexOf(current);
  if (idx === -1 || idx === STAGE_ORDER.length - 1) return null;
  return STAGE_ORDER[idx + 1];
}

function isBackward(from: JobStage, to: JobStage): boolean {
  return STAGE_ORDER.indexOf(to) < STAGE_ORDER.indexOf(from);
}

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("jobs")
      .withIndex("by_createdAt")
      .order("desc")
      .collect();
  },
});

export const listByStage = query({
  args: { stage: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("jobs")
      .withIndex("by_stage", (q) => q.eq("stage", args.stage as JobStage))
      .collect();
  },
});

export const create = mutation({
  args: {
    clientName: v.string(),
    materialId: v.id("materials"),
    layerHeight: v.number(),
    printerId: v.id("printers"),
    estimatedPrintTime: v.number(),
    estimatedVolumeCm3: v.number(),
    quotedPrice: v.optional(v.number()),
    materialUsedGrams: v.optional(v.number()),
    materialUsedMl: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Generate sequential job number
    const allJobs = await ctx.db.query("jobs").collect();
    const jobNumber = `JOB-${String(allJobs.length + 1).padStart(4, "0")}`;

    return await ctx.db.insert("jobs", {
      ...args,
      jobNumber,
      stage: "Pending",
      createdAt: Date.now(),
    });
  },
});

export const advanceStage = mutation({
  args: {
    jobId: v.id("jobs"),
    targetStage: v.optional(v.string()),
    confirmed: v.optional(v.boolean()),
    force: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) throw new ConvexError("JOB_NOT_FOUND");

    const currentStage = job.stage as JobStage;
    let targetStage: JobStage;

    if (args.targetStage) {
      targetStage = args.targetStage as JobStage;
      if (isBackward(currentStage, targetStage) && args.confirmed !== true) {
        throw new ConvexError("BACKWARD_TRANSITION_REQUIRES_CONFIRMATION");
      }
    } else {
      const next = getNextStage(currentStage);
      if (!next) throw new ConvexError("ALREADY_AT_FINAL_STAGE");
      targetStage = next;
    }

    const updates: Record<string, unknown> = { stage: targetStage };

    if (targetStage === "Printing") {
      updates.startedPrintingAt = Date.now();
    }

    if (targetStage === "Ready for Pickup") {
      const amount = job.materialUsedGrams ?? job.materialUsedMl ?? 0;
      if (amount > 0) {
        await ctx.runMutation(internal.materials.deductMaterial, {
          materialId: job.materialId,
          amount,
          force: args.force,
        });
      }
      // Record usage log entry
      const material = await ctx.db.get(job.materialId);
      if (material) {
        const costOfMaterial = material.type === "filament"
          ? amount * material.pricePerUnit
          : amount * material.pricePerUnit;
        await ctx.runMutation(internal.usageLog.record, {
          jobId: args.jobId,
          jobNumber: job.jobNumber,
          clientName: job.clientName,
          materialId: job.materialId,
          materialName: material.name,
          materialType: material.type,
          amountUsed: amount,
          costOfMaterial,
          quotedPrice: job.quotedPrice,
          completedAt: Date.now(),
        });
      }
    }

    await ctx.db.patch(args.jobId, updates);
  },
});

export const updateJob = mutation({
  args: {
    jobId: v.id("jobs"),
    clientName: v.optional(v.string()),
    layerHeight: v.optional(v.number()),
    estimatedPrintTime: v.optional(v.number()),
    estimatedVolumeCm3: v.optional(v.number()),
    quotedPrice: v.optional(v.number()),
    materialUsedGrams: v.optional(v.number()),
    materialUsedMl: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { jobId, ...fields } = args;
    await ctx.db.patch(jobId, fields);
  },
});
