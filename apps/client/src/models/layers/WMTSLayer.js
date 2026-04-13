import TileLayer from "ol/layer/Tile";
import WMTS from "ol/source/WMTS";
import WMTSTileGrid from "ol/tilegrid/WMTS";
import LayerInfo from "./LayerInfo";
import { overrideLayerSourceParams } from "../../utils/FetchWrapper";

var wmtsLayerProperties = {
  url: "",
  projection: "EPSG:3006",
  layer: "",
  opacity: 1,
  matrixSet: "3006",
  style: "",
  axisMode: "natural",
  origins: [[-1200000, 8500000]],
  resolutions: [4096, 2048, 1024, 512, 256, 128, 64, 32, 16, 8, 4, 2, 1, 0.5],
  matrixIds: [
    "0",
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "10",
    "11",
    "12",
  ],
  attribution: "",
};

class WMTSLayer {
  constructor(config, proxyUrl, map) {
    config = {
      ...wmtsLayerProperties,
      ...config,
    };

    this.proxyUrl = proxyUrl;

    const resolutions = config.resolutions.map((r) => Number(r));

    const parsedOrigins = (config.origins || []).map((o) =>
      o.map((v) => Number(v)),
    );

    const tileGridOrigin =
      parsedOrigins.length > 1
        ? { origins: parsedOrigins }
        : { origin: parsedOrigins[0] };

    const sourceConfig = {
      attributions: config.attribution,
      format: config.imageFormat || "image/png",
      wrapX: false,
      url: config.url,
      crossOrigin: config.crossOrigin,
      axisMode: config.axisMode,
      layer: config.layer,
      matrixSet: config.matrixSet,
      style: config.style,
      projection: config.projection,
      tileGrid: new WMTSTileGrid({
        ...tileGridOrigin,
        resolutions,
        matrixIds: config.matrixIds,
        sizes:
          Array.isArray(config.sizes) && config.sizes.length > 0
            ? config.sizes
            : undefined,
        tileSize: config.tileSize || undefined,
      }),
    };

    overrideLayerSourceParams(sourceConfig);

    const minZoom = config?.minZoom >= 0 ? config.minZoom : undefined;
    const maxZoom = config?.maxZoom >= 0 ? config.maxZoom : undefined;

    this.layer = new TileLayer({
      name: config.name,
      caption: config.caption,
      visible: config.visible,
      queryable: config.queryable,
      opacity: config.opacity,
      zIndex: config.zIndex,
      layerType: config.layerType,
      rotateMap: config.rotateMap,
      source: new WMTS(sourceConfig),
      layerInfo: new LayerInfo(config),
      minZoom,
      maxZoom,
    });

    this.type = "wmts";
  }
}

export default WMTSLayer;