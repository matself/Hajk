import { z } from "zod";

export const ThemeCreateSchema = z.object({
  title: z.string().min(1, "Theme title is required"),
  owner: z.string().optional(),
  description: z.string().optional(),
  keywords: z.array(z.string()).default([]),
  data: z.record(z.string(), z.unknown()),
});

export const ThemeUpdateSchema = z.object({
  title: z.string().min(1, "Theme title is required").optional(),
  owner: z.string().optional(),
  description: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  data: z.record(z.string(), z.unknown()).optional(),
});

export type ThemeCreateInput = z.infer<typeof ThemeCreateSchema>;
export type ThemeUpdateInput = z.infer<typeof ThemeUpdateSchema>;
