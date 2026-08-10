import { transform } from "ol/proj";
import Feature from "ol/Feature";
import Point from "ol/geom/Point";
import Vector from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { Circle as CircleStyle, Fill, Stroke, Style } from "ol/style";

import { DEFAULT_OPTIONS } from "./constants";

export default class OsmSearchModel {
  #map;
  #options;
  #source;
  #vector;
  #abortController;

  constructor(settings) {
    this.#map = settings.map;
    this.#options = { ...DEFAULT_OPTIONS, ...settings.options };

    this.#source = new VectorSource();
    this.#vector = new Vector({
      layerType: "system",
      zIndex: 5000,
      name: "pluginOsmSearch",
      caption: "OSM search layer",
      source: this.#source,
    });
    this.#map.addLayer(this.#vector);
  }

  /**
   * @summary Searches Nominatim for the given search string. Aborts any
   * previous, still in-flight, search before issuing the new one.
   * @param {string} searchString
   * @returns {Promise<Array>} Array of Nominatim result objects
   */
  search = async (searchString) => {
    this.#abortController?.abort();
    this.#abortController = new AbortController();

    const params = new URLSearchParams({
      q: searchString,
      format: "json",
      addressdetails: "0",
      limit: String(this.#options.limit),
    });

    if (this.#options.countrycodes) {
      params.set("countrycodes", this.#options.countrycodes);
    }

    const response = await fetch(`${this.#options.endpoint}?${params}`, {
      signal: this.#abortController.signal,
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error(`Nominatim search failed with status ${response.status}`);
    }

    return await response.json();
  };

  /**
   * @summary Places a marker at the given Nominatim result and zooms/pans
   * the map to it (using the result's bounding box, when available).
   * @param {object} result A single Nominatim result object
   */
  showResult = (result) => {
    const targetProjection = this.#map.getView().getProjection().getCode();
    const coordinate = transform(
      [parseFloat(result.lon), parseFloat(result.lat)],
      "EPSG:4326",
      targetProjection
    );

    const feature = new Feature({ geometry: new Point(coordinate) });
    feature.setStyle(
      new Style({
        image: new CircleStyle({
          radius: 8,
          stroke: new Stroke({ color: "#ffffff", width: 2 }),
          fill: new Fill({ color: "#d32f2f" }),
        }),
      })
    );

    this.#source.clear();
    this.#source.addFeature(feature);

    const boundingBox = result.boundingbox?.map(Number);
    if (this.#options.zoomToBoundingBox && boundingBox?.length === 4) {
      // Nominatim returns [south, north, west, east] (lat/lon, EPSG:4326)
      const [south, north, west, east] = boundingBox;
      const extent = [
        ...transform([west, south], "EPSG:4326", targetProjection),
        ...transform([east, north], "EPSG:4326", targetProjection),
      ];
      this.#map.getView().fit(extent, { maxZoom: 17, duration: 500 });
    } else {
      this.#map.getView().animate({
        center: coordinate,
        zoom: 15,
        duration: 500,
      });
    }
  };

  /**
   * @summary Removes the marker (if any) from the map.
   */
  clearResult = () => {
    this.#source.clear();
  };
}
