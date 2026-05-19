import { createElement, useCallback } from "react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { FieldLabelWithHelp } from "../../components/form-components/field-help-tooltip";

export type LayerFieldLabelFn = (
  labelKey: string,
  helpKey: string,
) => ReactNode;

export interface LayerFieldLabelsResult {
  fieldLabel: LayerFieldLabelFn;
  selectLabel: (labelKey: string, helpKey: string) => { label: ReactNode };
}

/** Field labels with hover help for layer settings forms. */
export function useLayerFieldLabels(): LayerFieldLabelsResult {
  const { t } = useTranslation();

  const translate = useCallback(
    (key: string): string => String(t(key as never)),
    [t],
  );

  const fieldLabel = useCallback<LayerFieldLabelFn>(
    (labelKey, helpKey) =>
      createElement(FieldLabelWithHelp, {
        label: translate(labelKey),
        help: translate(helpKey),
      }),
    [translate],
  );

  const selectLabel = useCallback(
    (labelKey: string, helpKey: string) => ({
      label: createElement(FieldLabelWithHelp, {
        label: translate(labelKey),
        help: translate(helpKey),
      }),
    }),
    [translate],
  );

  return { fieldLabel, selectLabel };
}
