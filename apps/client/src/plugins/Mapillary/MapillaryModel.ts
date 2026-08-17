import { transform } from "ol/proj";
import Style from "ol/style/Style";
import Icon from "ol/style/Icon";
import Feature from "ol/Feature";
import Point from "ol/geom/Point";
import Vector from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import type Geometry from "ol/geom/Geometry";
import type MapBrowserEvent from "ol/MapBrowserEvent";
import type OlMap from "ol/Map";
import { RenderMode, Viewer, type ViewerImageEvent } from "mapillary-js";

import type { MapillaryImageResult, MapillaryModelSettings } from "./types";

// Must match the id of the container div rendered by MapillaryView.
const CONTAINER_ID = "mapillary-window";

// `clickLock` is a Hajk convention attached to the OL Map instance at
// creation time (see models/appModel/mapFactory.js); it has no OL typings.
type MapWithClickLock = OlMap & { clickLock: Set<string> };

// Simple clockwise-pointing arrow, styled to match the marker used by other
// map-click tools. Rotated per-feature via the OL Icon `rotation` property,
// so (unlike a sprite sheet) any heading works without pre-baked frames.
const ARROW_SVG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32">
      <circle cx="16" cy="16" r="14" fill="#1976d2" stroke="#fff" stroke-width="2" />
      <path d="M16 6 L23 20 L16 16 L9 20 Z" fill="#fff" />
    </svg>`
  );

/** Haversine distance in meters between two [lng, lat] points. */
function distanceMeters(a: [number, number], b: [number, number]): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[1] - a[1]);
  const dLng = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Builds a [minLng, minLat, maxLng, maxLat] bbox around a point. */
function bboxAround(
  lng: number,
  lat: number,
  radiusMeters: number
): [number, number, number, number] {
  const dLat = radiusMeters / 111320;
  const dLng = radiusMeters / (111320 * Math.cos((lat * Math.PI) / 180));
  return [lng - dLng, lat - dLat, lng + dLng, lat + dLat];
}

/** Coarse grid key used to cache Graph API responses per click location. */
function gridKey(lng: number, lat: number): string {
  return `${lng.toFixed(3)}:${lat.toFixed(3)}`;
}

class MapillaryModel {
  private map: MapillaryModelSettings["map"];
  private localObserver: MapillaryModelSettings["localObserver"];
  private accessToken: string;
  private searchRadius: number;
  private fallbackSearchRadius: number;

  private markerLayer: Vector<VectorSource<Feature<Geometry>>>;
  private viewer?: Viewer;
  private resizeObserver?: ResizeObserver;
  private activated = false;
  private hasShownImage = false;

  private abortController?: AbortController;
  private resultCache = new Map<string, MapillaryImageResult[]>();

  private onSingleClick = (e: MapBrowserEvent) => this.handleClick(e);
  private onViewerImage = (e: ViewerImageEvent) => this.handleViewerImage(e);

  constructor(settings: MapillaryModelSettings) {
    this.map = settings.map;
    this.localObserver = settings.localObserver;
    this.accessToken = settings.accessToken;
    this.searchRadius = settings.searchRadius ?? 25;
    this.fallbackSearchRadius = settings.fallbackSearchRadius ?? 200;

    this.markerLayer = new Vector({
      source: new VectorSource(),
      // @ts-expect-error - layerType/name/caption are Hajk conventions, not part of OL's typings
      layerType: "system",
      zIndex: 5000,
      name: "pluginMapillary",
      caption: "Mapillary layer",
    });
    this.map.addLayer(this.markerLayer);
  }

  private get mapWithClickLock(): MapWithClickLock {
    return this.map as MapWithClickLock;
  }

  activate = () => {
    if (!this.accessToken) {
      console.warn("Mapillary: No access token configured.");
      this.localObserver.publish(
        "accessTokenMissing",
        new Error("No access token")
      );
      return;
    }
    this.mapWithClickLock.clickLock.add("mapillary");
    // Mutate only the cursor property. OL itself sets position/overflow/
    // width/height inline on this element at construction time (see
    // node_modules/ol/Map.js); setAttribute("style", ...) would replace the
    // whole attribute and wipe those out, breaking the map's layout.
    const viewportEl = document.querySelector<HTMLElement>(".ol-viewport");
    if (viewportEl) {
      viewportEl.style.cursor = "crosshair";
    }
    this.map.on("singleclick", this.onSingleClick);
    this.activated = true;
  };

  deactivate = () => {
    this.mapWithClickLock.clickLock.delete("mapillary");
    const viewportEl = document.querySelector<HTMLElement>(".ol-viewport");
    if (viewportEl) {
      viewportEl.style.cursor = "";
    }
    this.map.un("singleclick", this.onSingleClick);
    this.activated = false;
    this.hasShownImage = false;

    this.abortController?.abort();
    this.abortController = undefined;

    this.resizeObserver?.disconnect();
    this.resizeObserver = undefined;

    this.viewer?.off("image", this.onViewerImage);
    this.viewer?.remove();
    this.viewer = undefined;

    this.markerLayer.getSource()?.clear();
  };

  private async handleClick(e: MapBrowserEvent) {
    const coordinate = e.coordinate;
    const [lng, lat] = transform(
      coordinate,
      this.map.getView().getProjection(),
      "EPSG:4326"
    );

    this.abortController?.abort();
    const controller = new AbortController();
    this.abortController = controller;

    const candidate = await this.findNearestImage(lng, lat, controller.signal);
    if (controller.signal.aborted) {
      return;
    }

    if (!candidate) {
      this.localObserver.publish("noImageFound");
      return;
    }

    await this.showImage(candidate);
  }

  private async findNearestImage(
    lng: number,
    lat: number,
    signal: AbortSignal
  ): Promise<MapillaryImageResult | undefined> {
    let candidates = await this.getCachedOrFetch(
      lng,
      lat,
      this.searchRadius,
      signal
    );
    if (candidates === undefined) {
      // Request failed or was aborted.
      return undefined;
    }
    if (candidates.length === 0) {
      candidates = await this.getCachedOrFetch(
        lng,
        lat,
        this.fallbackSearchRadius,
        signal
      );
    }
    if (!candidates || candidates.length === 0) {
      return undefined;
    }

    // Take the closest handful, then prefer the most recently captured
    // among those - avoids surfacing a years-old image over a fresh one
    // a few meters away in well-covered urban areas.
    const closest = [...candidates]
      .sort(
        (a, b) =>
          distanceMeters([lng, lat], a.lngLat) -
          distanceMeters([lng, lat], b.lngLat)
      )
      .slice(0, 5);

    return closest.sort((a, b) => b.capturedAt - a.capturedAt)[0];
  }

  private async getCachedOrFetch(
    lng: number,
    lat: number,
    radiusMeters: number,
    signal: AbortSignal
  ): Promise<MapillaryImageResult[] | undefined> {
    const key = `${gridKey(lng, lat)}:${radiusMeters}`;
    const cached = this.resultCache.get(key);
    if (cached) {
      return cached;
    }

    try {
      const bbox = bboxAround(lng, lat, radiusMeters);
      const url =
        "https://graph.mapillary.com/images" +
        `?access_token=${encodeURIComponent(this.accessToken)}` +
        "&fields=id,captured_at,compass_angle,geometry" +
        `&bbox=${bbox.join(",")}` +
        "&limit=20";

      const response = await fetch(url, { signal });
      if (!response.ok) {
        throw new Error(`Mapillary API responded with ${response.status}`);
      }
      const json = await response.json();
      const results: MapillaryImageResult[] = (json.data ?? []).map(
        (entry: {
          id: string;
          captured_at: number;
          compass_angle: number;
          geometry: { coordinates: [number, number] };
        }) => ({
          id: entry.id,
          lngLat: entry.geometry.coordinates,
          capturedAt: entry.captured_at,
          compassAngle: entry.compass_angle ?? 0,
        })
      );

      this.resultCache.set(key, results);
      return results;
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        return undefined;
      }
      console.warn("Mapillary: image search failed:", err);
      this.localObserver.publish("loadFailed", err);
      return undefined;
    }
  }

  private async showImage(candidate: MapillaryImageResult) {
    const containerEl = document.getElementById(CONTAINER_ID);
    if (!containerEl) {
      console.warn("Mapillary: container not mounted, aborting.");
      return;
    }

    if (!this.viewer) {
      this.viewer = new Viewer({
        accessToken: this.accessToken,
        container: containerEl,
        component: { cover: false },
        // Default is RenderMode.Fill, which crops/recomputes field-of-view
        // to fill whatever aspect ratio the window happens to have -
        // perceived as the image "stretching" when the window is resized.
        // Letterbox always shows the full image at its true aspect ratio,
        // adding bars on whichever axis doesn't match instead.
        renderMode: RenderMode.Letterbox,
      });
      this.viewer.on("image", this.onViewerImage);

      // The container is still `display: none` (0x0) right now - the View
      // only switches it to `flex` in response to the "locationChanged"
      // event published below, and mapillary-js only auto-tracks *window*
      // resizes, not a container's own box changing. A ResizeObserver
      // catches every case that matters here - this initial reveal, the
      // user manually dragging the window's edge, anything - with no
      // frame-counting guesswork about when a display change actually
      // committed and painted.
      //
      // ResizeObserver fires immediately on observe() with the box's
      // *current* size, which is 0x0 right now since the container is still
      // hidden. Feeding that straight into viewer.resize() corrupts
      // mapillary-js's internal camera/projection state badly enough that a
      // later, correctly-sized resize() doesn't recover from it - the image
      // never renders even once the container becomes visible. Only ever
      // resize to a genuinely non-zero size.
      this.resizeObserver = new ResizeObserver((entries) => {
        const { width, height } = entries[0].contentRect;
        if (width > 0 && height > 0) {
          this.viewer?.resize();
        }
      });
      this.resizeObserver.observe(containerEl);
    }

    try {
      await this.viewer.moveTo(candidate.id);
    } catch (err) {
      console.warn("Mapillary: could not move to image:", err);
      this.localObserver.publish("noImageFound");
      return;
    }

    this.addMarker(candidate.lngLat, candidate.compassAngle);
    this.publishImageDate(candidate.capturedAt);

    if (!this.hasShownImage) {
      this.hasShownImage = true;
      this.localObserver.publish("locationChanged");
    }
  }

  /** Keeps the marker/heading in sync when the user navigates inside the viewer itself. */
  private handleViewerImage(e: ViewerImageEvent) {
    if (!this.activated) {
      return;
    }
    const { image } = e;
    this.addMarker([image.lngLat.lng, image.lngLat.lat], image.compassAngle);
    this.publishImageDate(image.capturedAt);
  }

  private publishImageDate(capturedAt: number) {
    const date = new Date(capturedAt);
    this.localObserver.publish(
      "imageDateChanged",
      `Bild tagen: ${date.toLocaleDateString("sv-SE")}`
    );
  }

  private addMarker(lngLat: [number, number], compassAngleDegrees: number) {
    const coordinate = transform(
      lngLat,
      "EPSG:4326",
      this.map.getView().getProjection()
    );
    const feature = new Feature({ geometry: new Point(coordinate) });
    feature.setStyle(this.getIconStyle(compassAngleDegrees));

    const source = this.markerLayer.getSource();
    source?.clear();
    source?.addFeature(feature);
  }

  private getIconStyle(compassAngleDegrees: number): Style {
    return new Style({
      image: new Icon({
        src: ARROW_SVG,
        rotation: (compassAngleDegrees * Math.PI) / 180,
        rotateWithView: true,
        anchor: [0.5, 0.5],
      }),
    });
  }
}

export default MapillaryModel;
