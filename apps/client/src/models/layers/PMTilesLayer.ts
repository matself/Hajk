import TileLayer from "ol/layer/Tile";
import { PMTilesRasterSource } from "ol-pmtiles";
import LayerInfo from "./LayerInfo";

/**
 * Raster PMTiles background/overlay layer.
 *
 * A PMTiles archive is a single static file (typically on S3 or any HTTP host
 * that supports range requests). `PMTilesRasterSource` extends OpenLayers'
 * `DataTile` source and yields decoded `HTMLImageElement`s, which the regular
 * canvas `ol/layer/Tile` renderer draws and reprojects the same way it does
 * XYZ or OSM sources — so no backend proxy is involved and non-3857 maps work.
 *
 * Only raster archives (PNG/JPEG/WebP tiles) are handled here; vector (MVT)
 * PMTiles would need a separate style pipeline and are out of scope.
 */

interface PMTilesLayerConfig {
  id: string;
  caption: string;
  url: string;
  visible?: boolean;
  opacity?: number;
  zIndex?: number;
  layerType?: string;
  rotateMap?: string;
  attribution?: string;
  minZoom?: number;
  maxZoom?: number;
  legend?: unknown[];
}

class PMTilesLayer {
  layer: TileLayer;
  type = "pmtiles";

  constructor(config: PMTilesLayerConfig) {
    const layerInfo = new LayerInfo({
      ...config,
      legend: config.legend || [],
    });

    this.layer = new TileLayer({
      source: new PMTilesRasterSource({
        url: config.url,
        attributions: config.attribution || "",
        ...((config.minZoom ?? -1) > 0 && { minZoom: config.minZoom }),
        ...((config.maxZoom ?? -1) > 0 && { maxZoom: config.maxZoom }),
      }),
      visible: config.visible,
      opacity: config.opacity ?? 1,
      zIndex: config.zIndex,
      // @ts-expect-error - layerType/name/caption/rotateMap/layerInfo are Hajk conventions, not part of OL's typings
      layerType: config.layerType,
      name: config.id,
      caption: config.caption,
      rotateMap: config.rotateMap,
      layerInfo,
    });
  }
}

export default PMTilesLayer;
