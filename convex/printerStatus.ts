import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Called by the Bambu bridge script to push live printer status.
 * Upserts by serialNumber so there's always one document per physical printer.
 */
export const upsert = mutation({
  args: {
    serialNumber: v.string(),
    printerName: v.string(),
    gcodeState: v.string(),
    progressPercent: v.number(),
    remainingMinutes: v.number(),
    gcodeFile: v.string(),
    nozzleTemp: v.number(),
    bedTemp: v.number(),
    layerNum: v.number(),
    totalLayers: v.number(),
    updatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("printerStatus")
      .withIndex("by_serial", (q) => q.eq("serialNumber", args.serialNumber))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, args);
    } else {
      await ctx.db.insert("printerStatus", args);
    }
  },
});

/**
 * Get live status for a specific printer by serial number.
 */
export const getBySerial = query({
  args: { serialNumber: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("printerStatus")
      .withIndex("by_serial", (q) => q.eq("serialNumber", args.serialNumber))
      .unique();
  },
});

/**
 * Get all printer statuses (for the Kanban board overview).
 */
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("printerStatus").collect();
  },
});
