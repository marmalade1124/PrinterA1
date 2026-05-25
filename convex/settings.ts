import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

const DEFAULTS = {
  electricityRatePerKwh: 10.5886,  // NORDECO Residential rate (May 2026)
  defaultMarkupBuffer: 15,
  clientHourlyRate: 50,             // ₱50 per hour charged to clients
};

export const get = query({
  args: {},
  handler: async (ctx) => {
    const doc = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "singleton"))
      .unique();
    if (!doc) return { ...DEFAULTS };
    return {
      electricityRatePerKwh: doc.electricityRatePerKwh,
      defaultMarkupBuffer: doc.defaultMarkupBuffer,
      clientHourlyRate: doc.clientHourlyRate ?? DEFAULTS.clientHourlyRate,
    };
  },
});

export const upsert = mutation({
  args: {
    electricityRatePerKwh: v.number(),
    defaultMarkupBuffer: v.number(),
    clientHourlyRate: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "singleton"))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, {
        electricityRatePerKwh: args.electricityRatePerKwh,
        defaultMarkupBuffer: args.defaultMarkupBuffer,
        clientHourlyRate: args.clientHourlyRate,
      });
    } else {
      await ctx.db.insert("settings", {
        key: "singleton",
        electricityRatePerKwh: args.electricityRatePerKwh,
        defaultMarkupBuffer: args.defaultMarkupBuffer,
        clientHourlyRate: args.clientHourlyRate,
      });
    }
  },
});
