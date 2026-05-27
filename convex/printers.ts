import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("printers").collect();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    powerConsumptionKw: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("printers", {
      name: args.name,
      powerConsumptionKw: args.powerConsumptionKw,
    });
  },
});

export const update = mutation({
  args: {
    printerId: v.id("printers"),
    name: v.optional(v.string()),
    powerConsumptionKw: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { printerId, ...fields } = args;
    await ctx.db.patch(printerId, fields);
  },
});

export const remove = mutation({
  args: { printerId: v.id("printers") },
  handler: async (ctx, args) => {
    // Check for active jobs referencing this printer before deleting
    const activeJobs = await ctx.db
      .query("jobs")
      .filter(q => q.and(
        q.eq(q.field("printerId"), args.printerId),
        q.neq(q.field("stage"), "Ready for Pickup")
      ))
      .first();
    if (activeJobs) throw new ConvexError("PRINTER_IN_USE");
    await ctx.db.delete(args.printerId);
  },
});
