import { isAxiosError } from "axios";
import type { TFunction } from "i18next";
import type { FieldValues, UseFormSetError } from "react-hook-form";
import type { ApiValidationDetail } from "../../../lib/internal-api-client";

interface GroupApiErrorBody {
  errorId?: string;
  error?: string;
  hajkCode?: string;
  details?: ApiValidationDetail[] | string;
}

const GROUP_FORM_FIELDS = new Set([
  "name",
  "internalName",
  "type",
  "locked",
  "roleIds",
]);

function getValidationMessages(data: GroupApiErrorBody | undefined): string[] {
  if (!data) return [];
  if (Array.isArray(data.details)) {
    return data.details.map((detail) => detail.message).filter(Boolean);
  }
  if (typeof data.details === "string" && data.details.trim()) {
    return [data.details.trim()];
  }
  return [];
}

function getApiErrorMessage(
  error: unknown,
  t: TFunction,
  fallbackKey: string,
  fallbackParams?: Record<string, string>,
): string {
  if (!isAxiosError<GroupApiErrorBody>(error) || !error.response) {
    return t(fallbackKey, fallbackParams);
  }

  const data = error.response.data;
  const validationMessages = getValidationMessages(data);
  if (validationMessages.length > 0) {
    return validationMessages.join(" · ");
  }

  if (typeof data?.error === "string" && data.error.trim()) {
    return data.error.trim();
  }

  return t(fallbackKey, fallbackParams);
}

export function getCreateGroupErrorMessage(error: unknown, t: TFunction): string {
  return getApiErrorMessage(error, t, "groups.createGroupFailed");
}

export function getUpdateGroupErrorMessage(
  error: unknown,
  t: TFunction,
  groupName?: string,
): string {
  return getApiErrorMessage(error, t, "groups.updateGroupFailed", {
    name: groupName ?? "",
  });
}

export function applyGroupFormValidationErrors(
  error: unknown,
  setError: UseFormSetError<FieldValues>,
): boolean {
  if (!isAxiosError<GroupApiErrorBody>(error) || !error.response) {
    return false;
  }

  const details = error.response.data?.details;
  if (!Array.isArray(details)) {
    return false;
  }

  let applied = false;
  for (const detail of details) {
    const field = detail.field?.split(".").pop() ?? detail.field;
    if (!field || !GROUP_FORM_FIELDS.has(field) || !detail.message) {
      continue;
    }
    setError(field, { type: "server", message: detail.message });
    applied = true;
  }
  return applied;
}

export function getDeleteGroupErrorMessage(
  error: unknown,
  t: TFunction,
  groupName?: string,
): string {
  if (isAxiosError<GroupApiErrorBody>(error)) {
    const message = error.response?.data?.error;
    if (
      error.response?.status === 409 &&
      typeof message === "string" &&
      message.trim()
    ) {
      return message.trim();
    }
  }

  return t("groups.deleteGroupFailed", { name: groupName ?? "" });
}
