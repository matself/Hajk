/**
 * Builds the unified, read-only view of every search source Hajk knows about
 * (wfslayer söklager plus WMS sublayers carrying search config), and computes
 * the P0 lint checks against it. Pure functions, no fetching, no React — so
 * they can be exercised against fixtures independent of the view.
 *
 * This mirrors the canonical shape described in the plan (id, pid, caption,
 * url, layers[], ...), but only carries what the read-only list needs.
 */

/**
 * @param {{wfslayers?: Array, wmslayers?: Array}} layersStore
 * @returns {Array} unified search sources
 */
export function buildUnifiedSources(layersStore) {
  const wmsLayerById = new Map(
    (layersStore.wmslayers || []).map((wms) => [wms.id, wms])
  );

  const wfsSources = (layersStore.wfslayers || []).map((l) => ({
    kind: "wfslayer",
    id: l.id,
    // Optional link to the WMS layer this data is also displayed as (see
    // searchSource.js#fromWfsLayer) - set through the söklager form's
    // "Kopplat kartlager" picker, not part of the legacy shape.
    pid: l.pid || undefined,
    caption: l.caption,
    parentCaption: l.pid ? wmsLayerById.get(l.pid)?.caption || null : null,
    url: l.url,
    layers: l.layers || [],
  }));

  const wmsSources = [];
  (layersStore.wmslayers || []).forEach((wms) => {
    (wms.layersInfo || []).forEach((sublayer) => {
      // Only sublayers that actually carry search config are search sources.
      // The rest are plain display sublayers and have nothing to lint here.
      if (!sublayer.searchUrl && !sublayer.searchPropertyName) return;
      wmsSources.push({
        kind: "wmssublayer",
        id: sublayer.id,
        pid: wms.id,
        caption: sublayer.caption || sublayer.id,
        parentCaption: wms.caption,
        url: sublayer.searchUrl || wms.url,
        layers: [sublayer.id],
      });
    });
  });

  return [...wfsSources, ...wmsSources];
}

/**
 * Two sources that share a url and at least one overlapping layer name
 * return the same features under two captions.
 */
export function findOverlaps(sources) {
  const overlaps = [];
  for (let i = 0; i < sources.length; i++) {
    for (let j = i + 1; j < sources.length; j++) {
      const a = sources[i];
      const b = sources[j];
      if (!a.url || !b.url || a.url !== b.url) continue;
      const shared = a.layers.filter((name) => b.layers.includes(name));
      if (shared.length > 0) {
        overlaps.push({ a, b, shared });
      }
    }
  }
  return overlaps;
}

/**
 * A search source's id collides with searchInVisibleLayers whenever any
 * *other* WMS parent has a sublayer with the same id — including a plain
 * display sublayer with no search config of its own. Making that sublayer
 * visible enables the search source, even though the two belong to
 * unrelated services. This is why the check walks the whole layers store,
 * not just the list of sources: a wfslayer id colliding with a WMS sublayer
 * id is included too, however unlikely given wfslayer ids are GUIDs.
 *
 * @param {Array} sources
 * @param {{wmslayers?: Array}} layersStore
 */
export function findIdCollisions(sources, layersStore) {
  const wmsLayers = layersStore.wmslayers || [];
  const collisions = [];

  sources.forEach((source) => {
    wmsLayers.forEach((wms) => {
      if (wms.id === source.pid) return; // same parent: not a collision
      (wms.layersInfo || []).forEach((sublayer) => {
        if (sublayer.id === source.id) {
          collisions.push({
            source,
            collidesWithParentId: wms.id,
            collidesWithParentCaption: wms.caption,
          });
        }
      });
    });
  });

  return collisions;
}

/**
 * Söklager carry no pid, so both WMS coupling features (showCorrespondingWMSLayers,
 * searchInVisibleLayers) are inert for them. Informational, not a defect.
 */
export function findUnlinked(sources) {
  return sources.filter((s) => !s.pid);
}

function getSearchToolOptions(mapConfig) {
  const tool = (mapConfig?.tools || []).find((t) => t.type === "search");
  return tool?.options || null;
}

/**
 * Finds ids referenced by a map's search tool options that no longer exist
 * in the layers store: options.layers[].id against wfslayers, and
 * selectedSources[] (WMS parent layer ids) against wmslayers.
 *
 * @param {string} mapName
 * @param {object} mapConfig
 * @param {{wfslayers?: Array, wmslayers?: Array}} layersStore
 */
export function findDanglingReferences(mapName, mapConfig, layersStore) {
  const options = getSearchToolOptions(mapConfig);
  if (!options) return [];

  const wfsIds = new Set((layersStore.wfslayers || []).map((l) => l.id));
  const wmsIds = new Set((layersStore.wmslayers || []).map((l) => l.id));

  const dangling = [];

  (options.layers || []).forEach((entry) => {
    if (entry?.id && !wfsIds.has(entry.id)) {
      dangling.push({
        mapName,
        field: "options.layers",
        id: entry.id,
      });
    }
  });

  (options.selectedSources || []).forEach((id) => {
    if (id && !wmsIds.has(id)) {
      dangling.push({
        mapName,
        field: "options.selectedSources",
        id,
      });
    }
  });

  return dangling;
}
