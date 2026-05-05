import { isAxiosError } from "axios";
import type { TFunction } from "i18next";

interface ServiceDeleteErrorBody {
  error?: string;
  errors?: { message?: string }[];
}

export function getDeleteServiceErrorMessage(
  error: unknown,
  t: TFunction,
  serviceName: string,
): string {
  if (!isAxiosError<ServiceDeleteErrorBody>(error)) {
    return t("services.deleteServiceFailed", { name: serviceName });
  }

  if (!error.response) {
    return t("services.deleteServiceNetworkError", { name: serviceName });
  }

  const status = error.response.status;
  const messageFromError = error.response.data?.error;
  const messageFromErrorsArray = error.response.data?.errors?.[0]?.message;
  const message = messageFromError ?? messageFromErrorsArray;

  if (typeof message === "string" && message.trim()) {
    return message.trim();
  }

  if (status === 403) {
    return t("services.deleteServiceForbidden", { name: serviceName });
  }

  if (status === 409) {
    return t("services.deleteServiceConflict", { name: serviceName });
  }

  if (status >= 500) {
    return t("services.deleteServiceServerError", { name: serviceName });
  }

  return t("services.deleteServiceFailed", { name: serviceName });
}
