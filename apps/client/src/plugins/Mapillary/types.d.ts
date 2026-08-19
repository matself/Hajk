import type { EventObserver } from "react-event-observer";
import type OlMap from "ol/Map";
import type { HajkApp } from "../../types/hajk";

// ---- Plugin options (from Admin config) ----

export interface MapillaryOptions {
  /** Mapillary client access token, see https://www.mapillary.com/dashboard/developers */
  accessToken: string;
  visibleAtStart?: boolean;
  title?: string;
  description?: string;
  /** Search radius in meters used when looking for the nearest image to a map click. Default 25. */
  searchRadius?: number;
  /** Fallback search radius in meters, used if nothing is found within `searchRadius`. Default 200. */
  fallbackSearchRadius?: number;
  [key: string]: unknown;
}

// ---- Mapillary plugin (top-level) props ----

export interface MapillaryProps {
  app: HajkApp;
  map: OlMap;
  options: MapillaryOptions;
  [key: string]: unknown;
}

// ---- Model constructor settings ----

export interface MapillaryModelSettings extends MapillaryOptions {
  map: OlMap;
  localObserver: EventObserver;
}

// ---- View props ----

export interface MapillaryViewProps {
  localObserver: EventObserver;
  displayViewer: boolean;
}

// ---- Graph API result, reduced to what we use ----

export interface MapillaryImageResult {
  id: string;
  lngLat: [number, number];
  capturedAt: number;
  compassAngle: number;
}
