// Since we don't want to download roboto from the Google CDN,
// we use fontSource and import all subsets that MUI relies on here.
import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";

// The documentHandler imports icons in a dynamic way. To avoid requests against
// an outside CDN, we make sure to install the required font for the icons as well.
import "@fontsource/material-icons";

import "ol/ol.css";
import "./custom-ol.css";

import { createRoot } from "react-dom/client";
import StartupError from "./components/Errors/StartupError";
import HajkThemeProvider from "./components/HajkThemeProvider";
import { initHFetch, hfetch, initFetchWrapper } from "./utils/FetchWrapper";
import LocalStorageHelper from "./utils/LocalStorageHelper";
import { getMergedSearchAndHashParams } from "./utils/getMergedSearchAndHashParams";
import {
  AccessError,
  NotFoundError,
  ServiceUnavailableError,
  MalformedConfigError,
} from "./utils/CustomErrors";
import { AVAILABLE_TOOLS } from "./constants";

function ensureActiveToolsAreValid(availableTools = []) {
  // First check if there's a valid array
  if (!Array.isArray(availableTools)) {
    console.warn(
      'availableTools should be an array. Falling back to default tools, which will load all available tools. Please check your appConfig.json and configure availableTools as an array. Example: "availableTools": ["LayerSwitcher", "Search"]'
    );
    return AVAILABLE_TOOLS;
  }

  // Now let's see that whatever's in availableTools is actually valid, i.e.
  // exists in the AVAILABLE_TOOLS list. If not, we log a warning and filter out the invalid tools.
  const validActiveTools = availableTools.filter((tool) => {
    if (!AVAILABLE_TOOLS.includes(tool)) {
      console.warn(
        `Tool "${tool}" in availableTools is not a valid tool. Please check your appConfig.json and ensure all tools listed in availableTools are valid. Valid tools are: ${AVAILABLE_TOOLS.join(", ")}.`
      );
      return false;
    }
    return true;
  });

  // If after filtering out invalid tools, we end up with an empty array, we fall back to the default of loading all tools.
  if (validActiveTools.length === 0) {
    console.warn(
      "No valid tools found in availableTools. Falling back to default tools, which will load all available tools."
    );
    return AVAILABLE_TOOLS;
  }

  return validActiveTools;
}

/**
 * Entry point to Hajk.
 * We start with initializing HFetch (that provides some custom fetch options
 * to all requests throughout the application). Next, we fetch appConfig.json.
 *
 * appConfig.json includes URL to Hajk's backend application,
 * as well as the default preferred map configuration's file name.
 */
initHFetch();

// We must define appConfig outside of the try so it's available in catch
// statement. If we fail at some point, we may still be able to use the
// error message from appConfig (depending on if we manage to load it or not).
let appConfig;

// Everything we learn about the failing request while the startup sequence
// runs. It ends up in the expandable technical section of the error page, so
// we keep adding to it as soon as a value becomes known.
const startupContext = {};

/**
 * By far the most common cause of a failed startup is a mapserviceBase that
 * doesn't match reality: a port that nothing listens on, or a value left at
 * "localhost" from a development setup and then deployed to a real server,
 * where "localhost" resolves to the visitor's own machine rather than ours.
 *
 * Neither case can be distinguished from a plain outage by looking at the
 * failed request alone, because the browser reports both as an opaque network
 * error. What we can do is compare mapserviceBase to the address the user is
 * actually visiting, which is enough to name the likely mistake outright.
 *
 * Returns a sentence to append to the error message, or null when the setting
 * looks consistent with where the page is served from.
 */
function diagnoseMapserviceBase(mapserviceBase) {
  if (typeof mapserviceBase !== "string" || mapserviceBase.trim() === "") {
    return null;
  }

  const page = window.location;
  let base;

  try {
    // A relative mapserviceBase (e.g. "/api/v2") is legitimate and resolves
    // against the page, which is exactly what we want to compare here.
    base = new URL(mapserviceBase, page.href);
  } catch {
    return `Inställningen mapserviceBase ("${mapserviceBase}") är inte en giltig adress. Rätta den i appConfig.json.`;
  }

  const isLoopback = (hostname) =>
    ["localhost", "127.0.0.1", "[::1]", "::1"].includes(hostname);

  if (isLoopback(base.hostname) && !isLoopback(page.hostname)) {
    // Keep the configured port and path and swap only the host: in this
    // scenario the port is usually right and the host is the copied-from-dev
    // part. If backend sits behind the same web server as the client, the
    // port should be dropped instead - hence the second half of the sentence.
    const suggestion = `${page.protocol}//${page.hostname}${base.port ? `:${base.port}` : ""}${base.pathname}`;
    return `Inställningen mapserviceBase pekar på ${base.origin}, men sidan visas från ${page.origin}. "localhost" syftar på besökarens egen dator, inte på servern, så adressen fungerar bara under utveckling. Ändra mapserviceBase i appConfig.json till den adress backend har utifrån sett, sannolikt ${suggestion} - eller ${page.origin}${base.pathname} om backend ligger bakom samma webbserver som klienten.`;
  }

  if (page.protocol === "https:" && base.protocol === "http:") {
    return `Sidan visas över https men mapserviceBase pekar på ${base.origin}, som använder http. Webbläsaren blockerar sådana anrop helt. Ändra mapserviceBase i appConfig.json till https.`;
  }

  if (base.hostname === page.hostname && base.port !== page.port) {
    return `Inställningen mapserviceBase pekar på port ${base.port || "(standard)"} medan sidan visas från port ${page.port || "(standard)"}. Kontrollera att backend verkligen lyssnar på port ${base.port || "(standard)"} och är nåbar därifrån, eller lägg backend bakom samma adress som klienten.`;
  }

  if (base.origin !== page.origin) {
    return `Inställningen mapserviceBase pekar på ${base.origin}, som är en annan adress än sidans egen (${page.origin}). Kontrollera att den adressen går att nå från webbläsaren och att backend tillåter anrop från ${page.origin} (CORS).`;
  }

  return null;
}

/**
 * Fetch and parse a JSON document, separating the three distinct ways this can
 * go wrong into three distinct errors. Without this the caller cannot tell
 * "server is unreachable" from "server answered with an HTML login page", and
 * that is precisely the distinction that makes the error page useful.
 *
 * 403, 404 and 422 are passed back to the caller rather than thrown, since only
 * the caller knows whether they are fatal or worth a retry against another map.
 */
const fetchJson = async (url, description) => {
  let response;

  try {
    response = await hfetch(url);
  } catch (cause) {
    // fetch() only rejects on network level failures: DNS, refused connection,
    // TLS problems, or a CORS preflight that never made it back.
    throw new ServiceUnavailableError(`Could not reach ${description}`, {
      cause,
      details: { url, description, reason: "network" },
    });
  }

  if ([403, 404, 422].includes(response.status)) {
    // A 422 means the backend read the file and refused it. Its message names
    // the actual defect, which beats anything we could infer from out here, so
    // carry it along for the technical details.
    const detail =
      response.status === 422
        ? await response.text().catch(() => undefined)
        : undefined;

    return { status: response.status, detail };
  }

  if (!response.ok) {
    throw new ServiceUnavailableError(`${description} returned an error`, {
      details: {
        url,
        description,
        status: response.status,
        statusText: response.statusText,
        reason: "http",
      },
    });
  }

  try {
    return { status: response.status, json: await response.json() };
  } catch (cause) {
    throw new MalformedConfigError(`${description} is not valid JSON`, {
      cause,
      details: {
        url,
        description,
        status: response.status,
        contentType: response.headers.get("content-type"),
        reason: "parse",
      },
    });
  }
};

try {
  const appConfigResult = await fetchJson("appConfig.json", "appConfig.json");

  if (appConfigResult.json === undefined) {
    throw new MalformedConfigError("appConfig.json could not be read", {
      details: {
        url: "appConfig.json",
        description: "appConfig.json",
        status: appConfigResult.status,
        reason: "missing",
      },
    });
  }

  appConfig = appConfigResult.json;

  // Legacy code expects certain keys to be existent in appConfig.
  // They should in fact be optional. Let's ensure they exist on
  // the object further down the code, even if they don't exist
  // in the config file itself.
  appConfig.proxy = appConfig.proxy || "";
  appConfig.searchProxy = appConfig.searchProxy || "";

  // Update hfetch with loaded config.
  initFetchWrapper(appConfig);

  // Grab URL params and save for later use
  const initialURLParams = getMergedSearchAndHashParams();

  // If m param is supplied, try loading a map with that name
  // or else, fall back to default from appConfig.json
  let activeMap = initialURLParams.has("m")
    ? initialURLParams.get("m")
    : appConfig.defaultMap;

  startupContext.requestedMap = activeMap;
  startupContext.mapCameFromUrlParam = initialURLParams.has("m");
  startupContext.defaultMap = appConfig.defaultMap;

  // Check if mapserviceBase is set in appConfig. If it is not, we will
  // fall back on the simple map and layer configurations found in /public.
  const useBackend = appConfig.mapserviceBase?.trim().length > 0;

  startupContext.mapserviceBase = useBackend
    ? appConfig.mapserviceBase
    : "(not set, using the local consolidated config in /public)";

  // Prepare a helper function that fetches config files
  const fetchConfig = async () => {
    if (useBackend === false) {
      // Load the user specified consolidated map and layers config, or fall back to default one
      const simpleConfig = `${initialURLParams.get("m") || "simpleMapAndLayersConfig"}.json`;
      startupContext.url = simpleConfig;
      return await fetchJson(
        simpleConfig,
        `the local map config (${simpleConfig})`
      );
    }

    // Prepare the URL config string
    const configUrl = `${appConfig.proxy}${appConfig.mapserviceBase}/config`;
    const requestedUrl = `${configUrl}/${activeMap}`;
    startupContext.url = requestedUrl;

    // Whatever the config service answers about the requested map is the
    // answer. Hajk used to retry against appConfig.defaultMap here, which
    // meant a broken map quietly opened a different one instead - the user got
    // a working map that simply wasn't the one they asked for, with nothing
    // said about it. There is no failure left that the retry could rescue
    // either: a 404 is already fatal a few lines down, a 5xx is a definitive
    // answer about this particular map, and if the service is unreachable then
    // asking it for a second map name cannot help.
    return await fetchJson(requestedUrl, `the map config service`);
  };

  // customTheme.json is optional cosmetics. A missing or broken file must never
  // take the entire application down, so absorb any failure here and carry on
  // with an empty set of theme overrides.
  const fetchCustomTheme = async () => {
    try {
      const { json } = await fetchJson("customTheme.json", "customTheme.json");
      return json || {};
    } catch (error) {
      console.warn(
        "Could not load customTheme.json. Continuing without custom theme overrides.",
        error
      );
      return {};
    }
  };

  const [mapConfigResult, customTheme] = await Promise.all([
    fetchConfig(),
    fetchCustomTheme(),
  ]);

  // If the config service says 403, throw a custom access denied error that we
  // later catch and display Access Denied message
  if (mapConfigResult.status === 403) {
    throw new AccessError("Access Denied", {
      details: { ...startupContext, status: 403 },
    });
  } else if (mapConfigResult.status === 404) {
    throw new NotFoundError("Map Config Not Found", {
      details: { ...startupContext, status: 404 },
    });
  } else if (mapConfigResult.status === 422) {
    // The backend found the file, read it, and rejected it: it is not a map
    // config. Nothing about that is transient, so there is nothing to retry.
    throw new MalformedConfigError("Map config file is not a map config", {
      details: {
        ...startupContext,
        status: 422,
        reason: "invalid-map-file",
        serverMessage: mapConfigResult.detail,
      },
    });
  }

  const mapConfig = mapConfigResult.json;

  // A syntactically valid JSON document that is not a map config is still
  // unusable. Catching it here beats failing much later with a cryptic message
  // about some undefined property deep inside the application.
  if (!mapConfig?.mapConfig?.map) {
    throw new MalformedConfigError("Map config is missing its map section", {
      details: {
        ...startupContext,
        reason: "shape",
        receivedKeys: Object.keys(mapConfig || {}).join(", ") || "(empty)",
      },
    });
  }

  const config = {
    activeMap: useBackend ? activeMap : "simpleMapAndLayersConfig", // If we are not utilizing mapService, we know that the active map must be "simpleMapAndLayersConfig".
    appConfig: appConfig,
    layersConfig: mapConfig.layersConfig,
    mapConfig: mapConfig.mapConfig,
    userDetails: mapConfig.userDetails,
    userSpecificMaps: mapConfig.userSpecificMaps,
    initialURLParams,
  };

  // For the sake of this example, I'm committing this basic object:
  // Expose a couple of useful properties as part of Hajk's public API. For
  // usage, see examples/embedded.html, which reads these values to control
  // which zoom levels are available in the embedded (outer) application.
  // This can be extended with more properties or even functions when the
  // need comes up.
  window.hajkPublicApi = {
    maxZoom: config.mapConfig.map.maxZoom,
    minZoom: config.mapConfig.map.minZoom,
  };

  // At this stage, we know for sure what activeMap is, so we can initiate the LocalStorageHelper
  LocalStorageHelper.setKeyName(config.activeMap);

  // Use availableTools from appConfig, with an empty array as fallback if not provided.
  const availableTools = ensureActiveToolsAreValid(appConfig.availableTools);

  // Invoke React's renderer. Render the theme. Theme will render the App.
  createRoot(document.getElementById("root")).render(
    <HajkThemeProvider
      activeTools={availableTools}
      config={config}
      customTheme={customTheme}
    />
  );
} catch (error) {
  console.error(error);

  const details = { ...startupContext, ...(error.details || {}) };

  // The single most common misconfiguration, named outright when we can spot it.
  // A 403, 404 or 422 is Hajk's own backend answering, which proves that
  // mapserviceBase points where it should - offering the hint there would send
  // the reader off after a setting that is demonstrably fine.
  const backendAnswered = [403, 404, 422].includes(details.status);
  const mapserviceBaseHint = backendAnswered
    ? null
    : diagnoseMapserviceBase(appConfig?.mapserviceBase);

  // The path Hajk itself is served from, with query string and hash stripped.
  // Used instead of a hard-coded "/" so the buttons keep working when Hajk is
  // deployed under a sub-path, which the build supports since vite.config.ts
  // sets `base: "./"`.
  const appRoot = window.location.pathname;
  const urlCouldBeTheProblem = Boolean(
    window.location.search || window.location.hash
  );

  // Prepare some empty variables
  let loadErrorTitle,
    loadErrorMessage,
    loadErrorReloadButtonText = "";
  const actions = [];

  const retryAction = {
    text: appConfig?.loadErrorRetryButtonText || "Försök igen",
    onClick: () => window.location.reload(),
    variant: "contained",
  };

  if (error instanceof AccessError) {
    loadErrorTitle = appConfig?.loadErrorAccessDeniedTitle || "Åtkomst nekad";
    loadErrorMessage =
      appConfig?.loadErrorAccessDeniedMessage ||
      `Du har inte behörighet till kartan "${details.requestedMap}". Om du borde ha det, kontakta systemansvarig. Har du precis loggat in kan du behöva ladda om sidan.`;
    actions.push(retryAction);
  } else if (error instanceof NotFoundError) {
    loadErrorTitle = appConfig?.loadErrorNotFoundTitle || "Kartan finns inte";
    loadErrorMessage =
      appConfig?.loadErrorNotFoundMessage ||
      (details.mapCameFromUrlParam
        ? `Det finns ingen karta som heter "${details.requestedMap}". Kontrollera stavningen av parametern m i adressfältet, eller öppna standardkartan med knappen nedan.`
        : `Standardkartan "${details.requestedMap}" saknas på servern. Kontrollera inställningen defaultMap i appConfig.json, att kartfilen finns i backendens App_Data-katalog, och att mapserviceBase pekar på rätt sökväg (${details.url}).`);
    // A 404 is quite likely caused by an erroneous `m` parameter, so offer to
    // drop it. Only worth showing when that is in fact where the name came from.
    if (details.mapCameFromUrlParam) {
      actions.push({
        text:
          appConfig?.loadErrorDefaultMapButtonText || "Öppna standardkartan",
        href: appRoot,
        variant: "contained",
      });
    }
  } else if (error instanceof ServiceUnavailableError) {
    loadErrorTitle =
      appConfig?.loadErrorServiceUnavailableTitle || "Kartservern svarar inte";
    loadErrorMessage =
      appConfig?.loadErrorServiceUnavailableMessage ||
      (details.reason === "network"
        ? `Ingen kontakt med kartservern på ${details.url}. ${mapserviceBaseHint || "Kontrollera att backend är igång och att inställningen mapserviceBase i appConfig.json pekar rätt. Kartan kan inte visas förrän servern svarar igen."}`
        : `Kartservern svarade med felkod ${details.status}${details.statusText ? ` (${details.statusText})` : ""}. Det är ett fel på serversidan. Kontakta systemansvarig och uppge den tekniska informationen nedan.`);
    actions.push(retryAction);
  } else if (
    error instanceof MalformedConfigError &&
    details.reason === "invalid-map-file"
  ) {
    loadErrorTitle =
      appConfig?.loadErrorInvalidMapFileTitle ||
      "Den angivna filen är ingen korrekt kartfil";
    loadErrorMessage =
      appConfig?.loadErrorInvalidMapFileMessage ||
      `Servern hittade "${details.requestedMap}.json" men avvisade den. Filen är ingen kartkonfiguration. Kontrollera filen i App_Data-katalogen. Se ytterligare tekniska information.`;
    // Reloading cannot fix a bad file, so don't offer it. If the name came from
    // the address bar, the default map is a way out that actually leads
    // somewhere.
    if (details.mapCameFromUrlParam) {
      actions.push({
        text:
          appConfig?.loadErrorDefaultMapButtonText || "Öppna standardkartan",
        href: appRoot,
        variant: "contained",
      });
    }
  } else if (error instanceof MalformedConfigError) {
    loadErrorTitle =
      appConfig?.loadErrorMalformedConfigTitle ||
      "Konfigurationen kunde inte läsas";
    loadErrorMessage =
      appConfig?.loadErrorMalformedConfigMessage ||
      (details.reason === "shape"
        ? `Svaret från ${details.url} är giltig JSON men innehåller ingen kartkonfiguration. Kontrollera att mapserviceBase pekar på Hajks backend och inte på någon annan tjänst.`
        : `Svaret från ${details.url} kunde inte tolkas som JSON${details.contentType ? `, servern skickade ${details.contentType}` : ""}. Vanliga orsaker är att en proxy eller inloggningssida svarar i stället för backend, eller att filen saknas och webbservern returnerar en HTML-sida i stället.${mapserviceBaseHint ? ` ${mapserviceBaseHint}` : ""}`);
    actions.push(retryAction);
  } else {
    loadErrorTitle = appConfig?.loadErrorTitle || "Ett fel har inträffat";
    loadErrorMessage =
      appConfig?.loadErrorMessage ||
      "Fel när applikationen skulle läsas in. Du kan försöka att återställa applikationen genom att trycka på knappen nedan. Om felet kvarstår, kontakta systemansvarig och uppge den tekniska informationen nedan.";
    loadErrorReloadButtonText =
      appConfig?.loadErrorReloadButtonText || "Återställ applikationen";
  }

  // The original reset button: drop every URL parameter and start over from the
  // app's own root. Kept as the primary action for the generic branch, and
  // offered as a secondary one whenever the URL could be part of the problem.
  if (loadErrorReloadButtonText.length > 0) {
    actions.push({
      text: loadErrorReloadButtonText,
      href: appRoot,
      variant: "contained",
    });
  } else if (urlCouldBeTheProblem && !details.mapCameFromUrlParam) {
    actions.push({
      text: appConfig?.loadErrorReloadButtonText || "Återställ applikationen",
      href: appRoot,
      variant: "outlined",
    });
  }

  createRoot(document.getElementById("root")).render(
    <StartupError
      loadErrorTitle={loadErrorTitle}
      loadErrorMessage={loadErrorMessage}
      actions={actions}
      technicalDetails={{
        Feltyp: error.name || "Error",
        Felmeddelande: error.message,
        Adress: details.url || window.location.href,
        "HTTP-status": details.status
          ? `${details.status}${details.statusText ? ` ${details.statusText}` : ""}`
          : undefined,
        "Content-Type": details.contentType,
        Karta: details.requestedMap,
        Standardkarta: details.defaultMap,
        "Karta från m-parameter": details.mapCameFromUrlParam
          ? "ja"
          : details.mapCameFromUrlParam === false
            ? "nej"
            : undefined,
        mapserviceBase: details.mapserviceBase,
        "Sidans adress": window.location.origin,
        "Trolig orsak": mapserviceBaseHint,
        "Nycklar i svaret": details.receivedKeys,
        "Serverns förklaring": details.serverMessage,
        Ursprungsfel: error.cause ? String(error.cause) : undefined,
        "Hajk-version": import.meta.env.VITE_APP_VERSION,
        Tidpunkt: new Date().toISOString(),
      }}
    />
  );
}
