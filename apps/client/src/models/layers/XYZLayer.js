import TileLayer from "ol/layer/Tile";
import XYZ from "ol/source/XYZ";
import LayerInfo from "./LayerInfo";

class XYZLayer {
  constructor(config) {
    const layerInfo = new LayerInfo({
      ...config,
      legend: config.legend || [],
    });

    this.layer = new TileLayer({
      name: config.id,
      caption: config.caption,
      visible: config.visible,
      opacity: config.opacity ?? 1,
      zIndex: config.zIndex,
      layerType: config.layerType,
      rotateMap: config.rotateMap,
      layerInfo,
      source: new XYZ({
        url: config.url,
        attributions: config.attribution || "",
        crossOrigin: config.crossOrigin ?? "anonymous",
        ...(config.minZoom > 0 && { minZoom: config.minZoom }),
        ...(config.maxZoom > 0 && { maxZoom: config.maxZoom }),
      }),
    });

    this.type = "xyz";
  }
}

export default XYZLayer;
