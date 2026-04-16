import { Layer } from "../../api/layers";
import { Service, SERVICE_TYPE } from "../../api/services";
import LayersList from "./components/layers-list";

const DISPLAY_LAYER_TYPES = new Set([
  SERVICE_TYPE.WMS,
  SERVICE_TYPE.WMTS,
  SERVICE_TYPE.ARCGIS,
  SERVICE_TYPE.VECTOR,
]);

const filterDisplayLayers = (layers: Layer[], services: Service[]): Layer[] =>
  layers.filter((layer) => {
    const service = services.find((s) => s.id === layer.serviceId);
    return service && DISPLAY_LAYER_TYPES.has(service.type);
  });

export default function DisplayLayersPage() {
  return (
    <LayersList
      filterLayers={filterDisplayLayers}
      showCreateButton={true}
      pageTitleKey="navBar.servicesAndLayers.displayLayers"
      baseRoute="/display-layers"
    />
  );
}
