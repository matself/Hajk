import { useMemo } from "react";
import {
  useQuery,
  useQueries,
  useMutation,
  useQueryClient,
  UseQueryResult,
} from "@tanstack/react-query";
import {
  getFolders,
  createFolder,
  renameFolder,
  deleteFolder,
  getDocuments,
  getDocument,
  getDocumentById,
  createDocument,
  saveDocument,
  moveDocument,
  deleteDocument,
} from "./requests";
import type {
  DocumentFolder,
  DocumentSummary,
  Document,
  DocumentWithFolder,
  FolderCreateInput,
  FolderRenameInput,
  DocumentCreateInput,
  DocumentSaveInput,
  DocumentMoveInput,
} from "./types";

// ─── Folder hooks ────────────────────────────────────────────────────────────

export const useFolders = (
  mapName: string | undefined
): UseQueryResult<DocumentFolder[]> => {
  return useQuery({
    queryKey: ["documentFolders", mapName],
    queryFn: () => getFolders(mapName!),
    enabled: !!mapName,
  });
};

export const useCreateFolder = (mapName: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: FolderCreateInput) => createFolder(mapName, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["documentFolders", mapName],
      });
    },
  });
};

export const useRenameFolder = (mapName: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      folderName,
      data,
    }: {
      folderName: string;
      data: FolderRenameInput;
    }) => renameFolder(mapName, folderName, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["documentFolders", mapName],
      });
    },
  });
};

export const useDeleteFolder = (mapName: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (folderName: string) => deleteFolder(mapName, folderName),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["documentFolders", mapName],
      });
    },
  });
};

// ─── Document hooks ──────────────────────────────────────────────────────────

/** Prefer the seeded "general" folder; otherwise use the first available folder. */
export function getDefaultDocumentFolder(
  folders: DocumentFolder[]
): string | undefined {
  if (folders.length === 0) return undefined;
  return folders.find((folder) => folder.name === "general")?.name ?? folders[0].name;
}

/**
 * Resolves which folder contains a document. Legacy menu items often store
 * `folder: ""` even though documents now live in named folders (e.g. "general").
 * When no folder is stored, falls back to the map default folder.
 */
export function useResolveDocumentFolder(
  mapName: string | undefined,
  documentName: string | undefined,
  storedFolder: string | undefined,
  folders: DocumentFolder[]
): { effectiveFolder: string | undefined; isResolving: boolean } {
  const trimmedDoc = documentName?.trim() ?? "";
  const storedFolderName = storedFolder?.trim() ?? "";
  const storedFolderValid =
    storedFolderName !== "" &&
    folders.some((folder) => folder.name === storedFolderName);

  const defaultFolder = useMemo(
    () => getDefaultDocumentFolder(folders),
    [folders]
  );

  const { data: storedFolderDocs = [], isLoading: storedFolderDocsLoading } =
    useDocuments(
      mapName,
      storedFolderValid ? storedFolderName : undefined
    );

  const storedFolderMatches =
    storedFolderValid &&
    trimmedDoc !== "" &&
    storedFolderDocs.some((doc) => doc.name === trimmedDoc);

  const shouldSearch =
    trimmedDoc !== "" && !!mapName && folders.length > 0 && !storedFolderMatches;

  const folderQueries = useQueries({
    queries: folders.map((folder) => ({
      queryKey: ["documents", mapName, folder.name],
      queryFn: () => getDocuments(mapName!, folder.name),
      enabled: shouldSearch,
      staleTime: 60_000,
    })),
  });

  const resolvedFromSearch = useMemo(() => {
    if (!shouldSearch) return undefined;
    for (let i = 0; i < folders.length; i++) {
      const docs = folderQueries[i]?.data;
      if (docs?.some((doc) => doc.name === trimmedDoc)) {
        return folders[i].name;
      }
    }
    return undefined;
  }, [shouldSearch, folderQueries, folders, trimmedDoc]);

  const effectiveFolder =
    storedFolderMatches
      ? storedFolderName
      : resolvedFromSearch ??
        (storedFolderValid ? storedFolderName : undefined) ??
        defaultFolder;

  const isResolving =
    (storedFolderValid && storedFolderDocsLoading && trimmedDoc !== "") ||
    (shouldSearch && folderQueries.some((query) => query.isLoading));

  return { effectiveFolder, isResolving };
}

export const useDocuments = (
  mapName: string | undefined,
  folder: string | undefined
): UseQueryResult<DocumentSummary[]> => {
  return useQuery({
    queryKey: ["documents", mapName, folder],
    queryFn: () => getDocuments(mapName!, folder!),
    enabled: !!mapName && !!folder,
  });
};

export const useDocument = (
  mapName: string | undefined,
  folder: string | undefined,
  name: string | undefined
): UseQueryResult<Document> => {
  return useQuery({
    queryKey: ["document", mapName, folder, name],
    queryFn: () => getDocument(mapName!, folder!, name!),
    enabled: !!mapName && !!folder && !!name,
  });
};

export const useDocumentById = (
  id: number | undefined,
): UseQueryResult<DocumentWithFolder> => {
  return useQuery<DocumentWithFolder>({
    queryKey: ["document-by-id", id],
    queryFn: (): Promise<DocumentWithFolder> => {
      if (id === undefined || Number.isNaN(id)) {
        throw new Error("Document id is required");
      }
      return getDocumentById(id);
    },
    enabled: id !== undefined && !Number.isNaN(id),
  });
};

export const useCreateDocument = (mapName: string, folder: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: DocumentCreateInput) =>
      createDocument(mapName, folder, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["documents", mapName, folder],
      });
    },
  });
};

export const useSaveDocument = (
  mapName: string,
  folder: string,
  name: string
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: DocumentSaveInput) =>
      saveDocument(mapName, folder, name, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["document", mapName, folder, name],
      });
      void queryClient.invalidateQueries({
        queryKey: ["documents", mapName, folder],
      });
    },
  });
};

export const useMoveDocument = (mapName: string, folder: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name, data }: { name: string; data: DocumentMoveInput }) =>
      moveDocument(mapName, folder, name, data),
    onSuccess: (_result, { data }) => {
      void queryClient.invalidateQueries({
        queryKey: ["documents", mapName, folder],
      });
      void queryClient.invalidateQueries({
        queryKey: ["documents", mapName, data.targetFolder],
      });
      void queryClient.invalidateQueries({
        queryKey: ["documentFolders", mapName],
      });
    },
  });
};

export const useMoveDocumentAcrossFolders = (mapName: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      sourceFolder,
      name,
      targetFolder,
    }: {
      sourceFolder: string;
      name: string;
      targetFolder: string;
    }) => moveDocument(mapName, sourceFolder, name, { targetFolder }),
    onSuccess: (_result, { sourceFolder, targetFolder }) => {
      void queryClient.invalidateQueries({
        queryKey: ["documents", mapName, sourceFolder],
      });
      void queryClient.invalidateQueries({
        queryKey: ["documents", mapName, targetFolder],
      });
      void queryClient.invalidateQueries({
        queryKey: ["documentFolders", mapName],
      });
    },
  });
};

export const useDeleteDocument = (mapName: string, folder: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => deleteDocument(mapName, folder, name),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["documents", mapName, folder],
      });
    },
  });
};
