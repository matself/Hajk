import type { EventObserver } from "react-event-observer";
import type OlMap from "ol/Map";
import type { HajkApp } from "../../types/hajk";

// ---- Plugin options (from Admin config / map config) ----

export interface MailFormOptions {
  visibleAtStart?: boolean;
  title?: string;
  description?: string;
  /** Address the generated mailto: link will be addressed to. */
  recipientEmail: string;
  /** Subject used for the generated email. */
  subject?: string;
  /** Optional helper text shown above the form fields. */
  instructions?: string;
  [key: string]: unknown;
}

/**
 * AnchorModel is plain JS and has no .d.ts of its own. This is the
 * subset of its API that MailForm relies on to build a link to the
 * current map view (same link the Anchor/"Dela" plugin produces).
 */
export interface AnchorModelInterface {
  getAnchor(preventHashUpdate?: boolean): Promise<string>;
}

/** HajkApp, extended with the core anchorModel used to build the map link. */
export interface MailFormApp extends HajkApp {
  anchorModel: AnchorModelInterface;
  globalObserver: EventObserver;
}

// ---- MailForm plugin (top-level) props ----

export interface MailFormProps {
  app: MailFormApp;
  map: OlMap;
  options: MailFormOptions;
  [key: string]: unknown;
}

// ---- View props ----

export interface MailFormViewProps {
  app: MailFormApp;
  options: MailFormOptions;
}
