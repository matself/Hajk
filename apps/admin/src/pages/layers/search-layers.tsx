import { Layer } from "../../api/layers";
import { Service, SERVICE_TYPE } from "../../api/services";
import LayersList from "./components/layers-list";

const filterSearchableLayers = (layers: Layer[], services: Service[]): Layer[] =>
  layers.filter((layer) => {
    const service = services.find((s) => s.id === layer.serviceId);
    return service?.type === SERVICE_TYPE.WFS;
  });

export default function SearchLayersPage() {
  return (
    <LayersList
      filterLayers={filterSearchableLayers}
      showCreateButton={true}
      pageTitleKey="navBar.servicesAndLayers.searchLayers"
      baseRoute="/search-layers"
    />
  );
}
