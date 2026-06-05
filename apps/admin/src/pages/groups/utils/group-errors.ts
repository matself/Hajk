import { isAxiosError } from "axios";
import type { TFunction } from "i18next";

export function getDeleteGroupErrorMessage(
  error: unknown,
  t: TFunction,
  groupName?: string,
): string {
  if (isAxiosError<{ error?: string; hajkCode?: string }>(error)) {
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
