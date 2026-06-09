import { z } from "zod";

export const FolderCreateSchema = z.object({
  title: z.string().min(1, "Folder title is required"),
});

export const FolderRenameSchema = z.object({
  title: z.string().min(1, "Folder title is required"),
});

export const DocumentCreateSchema = z.object({
  title: z.string().min(1, "Document title is required"),
});

export const DocumentSaveSchema = z.object({
  title: z.string().min(1, "Document title is required").optional(),
  content: z.record(z.string(), z.unknown()),
});

export const DocumentMoveSchema = z.object({
  targetFolder: z.string().min(1, "Target folder name is required"),
});

export type FolderCreateInput = z.infer<typeof FolderCreateSchema>;
export type FolderRenameInput = z.infer<typeof FolderRenameSchema>;
export type DocumentCreateInput = z.infer<typeof DocumentCreateSchema>;
export type DocumentSaveInput = z.infer<typeof DocumentSaveSchema>;
export type DocumentMoveInput = z.infer<typeof DocumentMoveSchema>;
