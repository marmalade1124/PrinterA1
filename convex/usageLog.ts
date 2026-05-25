import { query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

/** Called internally when a job reaches "Ready for Pickup" */
export const record = internalMutation({
  args: {
    jobId: v.id("jobs"),
    jobNumber: v.string(),
    clientName: v.string(),
    materialId: v.id("materials"),
    materialName: v.string(),
    materialType: v.union(v.literal("filament"), v.literal("resin")),
    amountUsed: v.number(),
    costOfMaterial: v.number(),
    quotedPrice: v.optional(v.number()),
    completedAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("materialUsageLog", args);
  },
});

/** All log entries, newest first */
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("materialUsageLog")
      .withIndex("by_completedAt")
      .order("desc")
      .collect();
  },
});

/** Summary stats for the dashboard */
export const summary = query({
  args: {},
  handler: async (ctx) => {
    const allJobs = await ctx.db.query("jobs").collect();
    const log = await ctx.db.query("materialUsageLog").collect();
    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

    // Jobs this week (created in last 7 days)
    const jobsThisWeek = allJobs.filter(j => j.createdAt >= weekAgo).length

    // Completed jobs this week
    const completedThisWeek = log.filter(l => l.completedAt >= weekAgo)

    // Revenue this week (sum of quoted prices)
    const revenueThisWeek = completedThisWeek.reduce(
      (sum, l) => sum + (l.quotedPrice ?? 0), 0
    )

    // Total material cost this week
    const materialCostThisWeek = completedThisWeek.reduce(
      (sum, l) => sum + l.costOfMaterial, 0
    )

    // Active jobs (not completed)
    const activeJobs = allJobs.filter(j => j.stage !== "Ready for Pickup").length

    // Jobs currently printing
    const printingJobs = allJobs.filter(j => j.stage === "Printing").length

    // Most used material (all time)
    const materialUsage: Record<string, { name: string; total: number; type: string }> = {}
    for (const entry of log) {
      if (!materialUsage[entry.materialId]) {
        materialUsage[entry.materialId] = {
          name: entry.materialName,
          total: 0,
          type: entry.materialType,
        }
      }
      materialUsage[entry.materialId].total += entry.amountUsed
    }
    const topMaterials = Object.values(materialUsage)
      .sort((a, b) => b.total - a.total)
      .slice(0, 3)

    return {
      jobsThisWeek,
      completedThisWeek: completedThisWeek.length,
      revenueThisWeek,
      materialCostThisWeek,
      activeJobs,
      printingJobs,
      topMaterials,
    }
  },
});
