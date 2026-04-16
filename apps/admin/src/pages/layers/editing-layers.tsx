import { Layer } from "../../api/layers";
import { Service, SERVICE_TYPE } from "../../api/services";
import LayersList from "./components/layers-list";

const filterEditableLayers = (layers: Layer[], services: Service[]): Layer[] =>
  layers.filter((layer) => {
    const service = services.find((s) => s.id === layer.serviceId);
    return service?.type === SERVICE_TYPE.WFST;
  });

export default function EditingLayersPage() {
  return (
    <LayersList
      filterLayers={filterEditableLayers}
      showCreateButton={true}
      pageTitleKey="navBar.servicesAndLayers.editingLayers"
      baseRoute="/editing-layers"
    />
  );
}
