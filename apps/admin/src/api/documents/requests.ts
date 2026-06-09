import { getApiClient, InternalApiError } from "../../lib/internal-api-client";
import type {
  DocumentFolder,
  DocumentSummary,
  Document,
  FolderCreateInput,
  FolderRenameInput,
  DocumentCreateInput,
  DocumentSaveInput,
  DocumentMoveInput,
  FoldersApiResponse,
  DocumentsApiResponse,
} from "./types";

const base = (mapName: string) =>
  `/maps/${encodeURIComponent(mapName)}/documenthandler`;

const folderBase = (mapName: string, folder: string) =>
  `${base(mapName)}/folders/${encodeURIComponent(folder)}`;

const docBase = (mapName: string, folder: string, name: string) =>
  `${folderBase(mapName, folder)}/documents/${encodeURIComponent(name)}`;

// ─── Folders ────────────────────────────────────────────────────────────────

export const getFolders = async (
  mapName: string
): Promise<DocumentFolder[]> => {
  const client = getApiClient();
  try {
    const response = await client.get<FoldersApiResponse>(
      `${base(mapName)}/folders`
    );
    return response.data.folders;
  } catch (error) {
    const axiosError = error as InternalApiError;
    throw new Error(
      axiosError.response
        ? `Failed to fetch folders. ErrorId: ${axiosError.response.data.errorId}.`
        : "Failed to fetch folders."
    );
  }
};

export const createFolder = async (
  mapName: string,
  data: FolderCreateInput
): Promise<DocumentFolder> => {
  const client = getApiClient();
  try {
    const response = await client.post<DocumentFolder>(
      `${base(mapName)}/folders`,
      data
    );
    return response.data;
  } catch (error) {
    const axiosError = error as InternalApiError;
    throw new Error(
      axiosError.response
        ? `Failed to create folder. ErrorId: ${axiosError.response.data.errorId}.`
        : "Failed to create folder."
    );
  }
};

export const renameFolder = async (
  mapName: string,
  folderName: string,
  data: FolderRenameInput
): Promise<DocumentFolder> => {
  const client = getApiClient();
  try {
    const response = await client.put<DocumentFolder>(
      folderBase(mapName, folderName),
      data
    );
    return response.data;
  } catch (error) {
    const axiosError = error as InternalApiError;
    throw new Error(
      axiosError.response
        ? `Failed to rename folder. ErrorId: ${axiosError.response.data.errorId}.`
        : "Failed to rename folder."
    );
  }
};

export const deleteFolder = async (
  mapName: string,
  folderName: string
): Promise<void> => {
  const client = getApiClient();
  try {
    await client.delete(folderBase(mapName, folderName));
  } catch (error) {
    const axiosError = error as InternalApiError;
    throw new Error(
      axiosError.response
        ? `Failed to delete folder. ErrorId: ${axiosError.response.data.errorId}.`
        : "Failed to delete folder."
    );
  }
};

// ─── Documents ───────────────────────────────────────────────────────────────

export const getDocuments = async (
  mapName: string,
  folder: string
): Promise<DocumentSummary[]> => {
  const client = getApiClient();
  try {
    const response = await client.get<DocumentsApiResponse>(
      `${folderBase(mapName, folder)}/documents`
    );
    return response.data.documents;
  } catch (error) {
    const axiosError = error as InternalApiError;
    throw new Error(
      axiosError.response
        ? `Failed to fetch documents. ErrorId: ${axiosError.response.data.errorId}.`
        : "Failed to fetch documents."
    );
  }
};

export const getDocument = async (
  mapName: string,
  folder: string,
  name: string
): Promise<Document> => {
  const client = getApiClient();
  try {
    const response = await client.get<Document>(docBase(mapName, folder, name));
    return response.data;
  } catch (error) {
    const axiosError = error as InternalApiError;
    throw new Error(
      axiosError.response
        ? `Failed to fetch document. ErrorId: ${axiosError.response.data.errorId}.`
        : "Failed to fetch document."
    );
  }
};

export const createDocument = async (
  mapName: string,
  folder: string,
  data: DocumentCreateInput
): Promise<Document> => {
  const client = getApiClient();
  try {
    const response = await client.post<Document>(
      `${folderBase(mapName, folder)}/documents`,
      data
    );
    return response.data;
  } catch (error) {
    const axiosError = error as InternalApiError;
    throw new Error(
      axiosError.response
        ? `Failed to create document. ErrorId: ${axiosError.response.data.errorId}.`
        : "Failed to create document."
    );
  }
};

export const saveDocument = async (
  mapName: string,
  folder: string,
  name: string,
  data: DocumentSaveInput
): Promise<Document> => {
  const client = getApiClient();
  try {
    const response = await client.put<Document>(
      docBase(mapName, folder, name),
      data
    );
    return response.data;
  } catch (error) {
    const axiosError = error as InternalApiError;
    throw new Error(
      axiosError.response
        ? `Failed to save document. ErrorId: ${axiosError.response.data.errorId}.`
        : "Failed to save document."
    );
  }
};

export const moveDocument = async (
  mapName: string,
  folder: string,
  name: string,
  data: DocumentMoveInput
): Promise<Document> => {
  const client = getApiClient();
  try {
    const response = await client.patch<Document>(
      `${docBase(mapName, folder, name)}/move`,
      data
    );
    return response.data;
  } catch (error) {
    const axiosError = error as InternalApiError;
    throw new Error(
      axiosError.response
        ? `Failed to move document. ErrorId: ${axiosError.response.data.errorId}.`
        : "Failed to move document."
    );
  }
};

export const deleteDocument = async (
  mapName: string,
  folder: string,
  name: string
): Promise<void> => {
  const client = getApiClient();
  try {
    await client.delete(docBase(mapName, folder, name));
  } catch (error) {
    const axiosError = error as InternalApiError;
    throw new Error(
      axiosError.response
        ? `Failed to delete document. ErrorId: ${axiosError.response.data.errorId}.`
        : "Failed to delete document."
    );
  }
};
