import { useCallback } from "react";
import { useTranslation } from "react-i18next";

/** Resolves i18n label keys to the current UI language for settings search. */
export function useSettingsSearchLabels() {
  const { t } = useTranslation();

  return useCallback(
    (...labelKeys: string[]) =>
      labelKeys.map((key) => String(t(key as never))),
    [t],
  );
}
