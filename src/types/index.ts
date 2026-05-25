export type JobStage =
  | "Pending"
  | "Slicing"
  | "Printing"
  | "Post-Processing"
  | "Ready for Pickup";

export type MaterialType = "filament" | "resin";

export const STAGE_ORDER = [
  "Pending",
  "Slicing",
  "Printing",
  "Post-Processing",
  "Ready for Pickup",
] as const;
