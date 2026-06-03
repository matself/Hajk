import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import UsedInMapsPanel from "../../components/used-in-maps-panel";
import { useLayerUsage } from "../../api/layers";

function UsedInMapsGrid({ layerId }: { layerId: string }) {
  const { t } = useTranslation();
  const { data: usage = [], isLoading } = useLayerUsage(layerId);

  const rows = useMemo(
    () =>
      usage.map((entry) => ({
        id: entry.id,
        map:
          entry.map?.name ??
          entry.group?.maps.map((m) => m.mapName).join(", ") ??
          "—",
        group: entry.group?.name ?? "—",
        usage: t(`common.usage.${entry.usage}`),
      })),
    [usage, t],
  );

  return (
    <UsedInMapsPanel
      rows={rows}
      isLoading={isLoading}
      emptyMessage={t("layers.usedInMapsNone")}
      showGroupColumn
      showUsageColumn
    />
  );
}

export default UsedInMapsGrid;
