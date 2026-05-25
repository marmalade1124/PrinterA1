import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("materials").collect();
  },
});

export const lowStockCount = query({
  args: {},
  handler: async (ctx) => {
    const materials = await ctx.db.query("materials").collect();
    return materials.filter((m) => m.stockLevel <= m.lowStockThreshold).length;
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    type: v.union(v.literal("filament"), v.literal("resin")),
    pricePerUnit: v.number(),
    density: v.optional(v.number()),
    stockLevel: v.number(),
    lowStockThreshold: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("materials", args);
  },
});

export const updateStock = mutation({
  args: {
    materialId: v.id("materials"),
    newLevel: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.materialId, { stockLevel: args.newLevel });
  },
});

export const updateThreshold = mutation({
  args: {
    materialId: v.id("materials"),
    threshold: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.materialId, { lowStockThreshold: args.threshold });
  },
});

export const remove = mutation({
  args: { materialId: v.id("materials") },
  handler: async (ctx, args) => {
    // Check for active jobs referencing this material
    const activeJobs = await ctx.db
      .query("jobs")
      .filter((q) =>
        q.and(
          q.eq(q.field("materialId"), args.materialId),
          q.neq(q.field("stage"), "Ready for Pickup")
        )
      )
      .first();
    if (activeJobs) {
      throw new ConvexError("MATERIAL_IN_USE");
    }
    await ctx.db.delete(args.materialId);
  },
});

export const deductMaterial = internalMutation({
  args: {
    materialId: v.id("materials"),
    amount: v.number(),
    force: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const material = await ctx.db.get(args.materialId);
    if (!material) throw new ConvexError("MATERIAL_NOT_FOUND");
    const newLevel = material.stockLevel - args.amount;
    if (newLevel < 0 && args.force !== true) {
      throw new ConvexError("INSUFFICIENT_STOCK");
    }
    await ctx.db.patch(args.materialId, { stockLevel: Math.max(0, newLevel) });
  },
});
