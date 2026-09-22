import { z } from "zod";
import { isMenuImageUrl } from "./config";

const menuImageSchema = z.object({
  url: z.string().refine(isMenuImageUrl),
  originalUrl: z.string().refine(isMenuImageUrl),
  width: z.number().positive().nullable(),
  height: z.number().positive().nullable(),
});

export const restaurantSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  building: z.string(),
  location: z.string(),
  category: z.enum(["한식뷔페", "구내식당", "식당"]),
});

const lunchMenuSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().min(1),
  publishedAt: z.iso.datetime(),
  sourceUrl: z.url(),
  restaurant: restaurantSchema,
  images: z.array(menuImageSchema),
  text: z.string(),
});

export const snapshotSchema = z.object({
  version: z.literal(1),
  date: z.iso.date(),
  cutoffAt: z.iso.datetime(),
  collectedAt: z.iso.datetime(),
  menus: z.array(lunchMenuSchema),
  warnings: z.array(z.string()),
});

export type MenuImage = z.infer<typeof menuImageSchema>;
export type Restaurant = z.infer<typeof restaurantSchema>;
export type LunchMenu = z.infer<typeof lunchMenuSchema>;
export type MenuSnapshot = z.infer<typeof snapshotSchema>;

export const menuStateSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("ready"),
    snapshot: snapshotSchema,
    stale: z.boolean(),
  }),
  z.object({
    status: z.literal("error"),
    date: z.string(),
    message: z.string(),
  }),
]);

export type MenuState = z.infer<typeof menuStateSchema>;
