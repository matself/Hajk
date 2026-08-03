import X2JS from "x2js";
import { Model } from "backbone";
import WMSCapabilities from "ol/format/WMSCapabilities";
import $ from "jquery";
import { prepareProxyUrl } from "../utils/ProxyHelper";
import { hfetch } from "utils/FetchWrapper";

const WMS_VERSION_1_3_0 = "1.3.0";
const WMS_VERSION_1_1_1 = "1.1.1";
const WMS_VERSION_1_1_0 = "1.1.0";
const WMS_VERSION_1_0_0 = "1.0.0";

const defaultVersions = [
  WMS_VERSION_1_3_0,
  WMS_VERSION_1_1_1,
  WMS_VERSION_1_1_0,
  WMS_VERSION_1_0_0,
];

// Recursively finds the first "leaf" object in a parsed GetFeatureInfo
// response - one whose own properties are all primitive values - and
// returns its keys. This is a generic, server-agnostic way to locate a
// feature's attribute bag, since GML/XML GetFeatureInfo responses nest
// the actual attributes at wildly different depths/names depending on
// the WMS vendor (GeoServer, MapServer, QGIS Server, ArcGIS...).
function findFirstFeatureAttributeKeys(node) {
  if (!node || typeof node !== "object") {
    return null;
  }
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) {
      const found = findFirstFeatureAttributeKeys(node[i]);
      if (found) {
        return found;
      }
    }
    return null;
  }
  const keys = Object.keys(node).filter((k) => k.indexOf("_") !== 0);
  if (keys.length === 0) {
    return null;
  }
  const allPrimitive = keys.every((k) => {
    const v = node[k];
    return (
      v === null ||
      typeof v === "string" ||
      typeof v === "number" ||
      typeof v === "boolean"
    );
  });
  if (allPrimitive) {
    return keys;
  }
  for (let i = 0; i < keys.length; i++) {
    const found = findFirstFeatureAttributeKeys(node[keys[i]]);
    if (found) {
      return found;
    }
  }
  return null;
}

function extractAttributeNamesFromFeatureInfo(data, infoFormat) {
  try {
    if (
      infoFormat === "application/json" ||
      infoFormat === "application/geo+json"
    ) {
      if (data && Array.isArray(data.features) && data.features.length > 0) {
        return Object.keys(data.features[0].properties || {});
      }
      return null;
    }
    const parser = new X2JS();
    const xmlstr = data.xml
      ? data.xml
      : new XMLSerializer().serializeToString(data);
    const json = parser.xml2js(xmlstr);
    return findFirstFeatureAttributeKeys(json);
  } catch (e) {
    return null;
  }
}

var manager = Model.extend({
  defaults: {
    layers: [],
    mapConfigs: [],
    mapsWithLayers: [],
  },

  fetchAllMapConfigsToModel: function (callback = function devNull() {}) {
    $.ajax({
      url: prepareProxyUrl(
        this.get("config").url_map_list,
        this.get("config").url_proxy
      ),
      method: "GET",
      contentType: "application/json",
      success: (data) => {
        // Save all mapConfig names returned, we'll need them layer
        this.set({ mapConfigs: data });

        // Loop through all config names, and fetch the config files
        for (let i = 0; i < data.length; i++) {
          let url = prepareProxyUrl(
            this.get("config").url_map + "/" + data[i],
            this.get("config").url_proxy
          );
          hfetch(url).then((res) => {
            // JSONify, filter just for one tool (layerswitcher), and then use first element (it's an array…)
            res.json().then((d) => {
              let layerswitcherConfig = d.tools?.filter(
                (tool) => tool.type === "layerswitcher"
              )[0];

              // Created washed object that contains map title, baselayers and groups with layers.
              // This will be used for filtering.
              let washed = {
                mapFilename: data[i],
                mapTitle: d.map?.title,
                layers: {
                  baseLayers: layerswitcherConfig?.options.baselayers,
                  groups: layerswitcherConfig?.options.groups,
                },
              };

              // Push into model for later use
              this.get("mapsWithLayers").push(washed);
            });
          });
        }

        callback(data);
      },
      error: (message) => {
        console.error(message);
        callback(message);
      },
    });
  },

  parseDate(date) {
    var parsed = parseInt(date, 10);
    return isNaN(parsed) ? date : new Date(parsed).toLocaleString();
  },

  getUrl: function (layer) {
    var t = layer["type"];
    delete layer["type"];
    switch (t) {
      case "WMS":
        return this.get("config").url_layer_settings;
      case "WMTS":
        return this.get("config").url_wmtslayer_settings;
      case "ArcGIS":
        return this.get("config").url_arcgislayer_settings;
      case "Vector":
        return this.get("config").url_vectorlayer_settings;
      case "XYZ":
        return this.get("config").url_xyzlayer_settings;
      default:
        break;
    }
  },

  getConfig: function (url) {
    $.ajax(prepareProxyUrl(url, this.get("config").url_proxy), {
      success: (data) => {
        var layers = [];
        if (data && Array.isArray(data.wmslayers)) {
          data.wmslayers.forEach((l) => {
            l.type = "WMS";
          });
          layers = layers.concat(data.wmslayers);
        }
        if (data && Array.isArray(data.wmtslayers)) {
          data.wmtslayers.forEach((l) => {
            l.type = "WMTS";
          });
          layers = layers.concat(data.wmtslayers);
        }
        if (data && Array.isArray(data.arcgislayers)) {
          data.arcgislayers.forEach((l) => {
            l.type = "ArcGIS";
          });
          layers = layers.concat(data.arcgislayers);
        }
        if (data && Array.isArray(data.vectorlayers)) {
          data.vectorlayers.forEach((l) => {
            l.type = "Vector";
          });
          layers = layers.concat(data.vectorlayers);
        }
        if (data && Array.isArray(data.xyzlayers)) {
          data.xyzlayers.forEach((l) => {
            l.type = "XYZ";
          });
          layers = layers.concat(data.xyzlayers);
        }

        layers.sort((a, b) => {
          var d1 = parseInt(a.date, 10),
            d2 = parseInt(b.date, 10);
          return d1 === d2 ? 0 : d1 < d2 ? 1 : -1;
        });
        this.set("layers", layers);
      },
    });
  },

  getLegend: function (state, callback) {
    $.ajax({
      url: state.url + "/legend",
      method: "GET",
      dataType: "json",
      data: {
        f: "json",
      },
      success: (rsp) => {
        var legends = [],
          addedLayers = state.addedLayers.map((layer) => layer.id);

        rsp.layers.forEach((legendLayer) => {
          if (addedLayers.indexOf(legendLayer.layerId) !== -1) {
            legendLayer.legend.forEach((legend) => {
              legends.push(
                `data:${legend.contentType};base64,${legend.imageData}&${legendLayer.layerName}`
              );
            });
          }
        });

        callback(legends.join("#"));
      },
      error: () => {
        callback(false);
      },
    });
  },

  addLayer: function (layer, callback) {
    var url = this.getUrl(layer);
    hfetch(url, {
      method: "POST",
      cache: "no-cache",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(layer),
    })
      .then((response) => {
        callback(true);
      })
      .catch((error) => {
        callback(false);
      });
  },

  updateLayer: function (layer, callback) {
    var url = this.getUrl(layer);
    $.ajax({
      url: url,
      method: "PUT",
      contentType: "application/json",
      data: JSON.stringify(layer),
      success: () => {
        callback(true);
      },
      error: () => {
        callback(false);
      },
    });
  },

  removeLayer: function (layer, callback) {
    var url = this.getUrl(layer);
    $.ajax({
      url: url + "/" + layer.id,
      method: "DELETE",
      contentType: "application/json",
      success: () => {
        callback(true);
      },
      error: () => {
        callback(false);
      },
    });
  },

  getWFSLayerDescription: function (url, layer, callback) {
    url = prepareProxyUrl(url, this.get("config").url_proxy);
    $.ajax(url, {
      data: {
        service: "WFS",
        request: "describeFeatureType",
        typename: layer,
      },
      success: (data) => {
        // Not every WMS also exposes WFS DescribeFeatureType on the same
        // endpoint - some servers (e.g. Naturvårdsregistret) ignore the
        // service/request params entirely and just return their normal
        // WMS GetCapabilities document instead. That means `data` may not
        // even be a parseable XML Node, so the whole thing - not just the
        // schema navigation below - needs to be guarded.
        try {
          var parser = new X2JS(),
            xmlstr = data.xml
              ? data.xml
              : new XMLSerializer().serializeToString(data),
            apa = parser.xml2js(xmlstr);
          var props =
            apa.schema.complexType.complexContent.extension.sequence.element.map(
              (a) => {
                return {
                  name: a._name,
                  localType: a._type
                    ? a._type.replace(a.__prefix + ":", "")
                    : "",
                };
              }
            );
          if (props) {
            callback(props);
          } else {
            callback(false);
          }
        } catch (e) {
          callback(false);
        }
      },
      error: () => {
        callback(false);
      },
    });
  },

  // Fallback for WMS-only services that don't expose WFS DescribeFeatureType
  // (which is most public/open WMS services, deliberately, since WFS would
  // let anyone download the underlying data). Since GetCapabilities never
  // contains attribute/field names for any WMS version, the only remaining
  // option is a real GetFeatureInfo request - and blindly guessing a
  // coordinate inside the layer's bbox has near-zero odds of landing on a
  // feature for sparse data (e.g. a few dozen small polygons scattered
  // across an entire country). Instead: render the layer, find an actual
  // painted pixel, and query exactly that spot - guaranteed to hit a real
  // feature if the layer draws anything at all in view.
  probeWmsFeatureAttributes: function (
    url,
    layerName,
    bbox,
    infoFormat,
    callback
  ) {
    const proxyUrl = prepareProxyUrl(url, this.get("config").url_proxy);
    const width = 1024;
    const height = 1024;
    const bboxParam = [bbox.minx, bbox.miny, bbox.maxx, bbox.maxy].join(",");

    const buildUrl = (params) => {
      const query = $.param(params);
      return proxyUrl + (proxyUrl.indexOf("?") > -1 ? "&" : "?") + query;
    };

    const getMapUrl = buildUrl({
      service: "WMS",
      version: "1.1.1",
      request: "GetMap",
      layers: layerName,
      styles: "",
      format: "image/png",
      transparent: "true",
      width,
      height,
      srs: "EPSG:4326",
      bbox: bboxParam,
    });

    const queryFeatureInfoAt = (px, py) => {
      $.ajax(proxyUrl, {
        data: {
          service: "WMS",
          version: "1.1.1",
          request: "GetFeatureInfo",
          layers: layerName,
          query_layers: layerName,
          info_format: infoFormat,
          feature_count: 1,
          width,
          height,
          x: px,
          y: py,
          srs: "EPSG:4326",
          bbox: bboxParam,
        },
        dataType: infoFormat === "application/json" ? "json" : "xml",
        success: (data) => {
          const names = extractAttributeNamesFromFeatureInfo(data, infoFormat);
          if (names && names.length > 0) {
            callback(names.map((name) => ({ name, localType: "" })));
          } else {
            callback(
              false,
              "Testklicket gav ingen tolkningsbar attributlista."
            );
          }
        },
        error: () => {
          callback(false, "GetFeatureInfo-anropet misslyckades.");
        },
      });
    };

    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      let px = null;
      let py = null;
      try {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        const { data } = ctx.getImageData(0, 0, width, height);
        // Scan the alpha channel (every 4th byte) for the first painted
        // pixel. A low threshold (rather than requiring fully opaque)
        // still catches thin/anti-aliased edges of small polygons.
        for (let i = 3; i < data.length; i += 4) {
          if (data[i] > 10) {
            const pixelIndex = (i - 3) / 4;
            px = pixelIndex % width;
            py = Math.floor(pixelIndex / width);
            break;
          }
        }
      } catch (e) {
        // Tainted canvas - the proxied image response didn't allow
        // cross-origin pixel reads. Nothing more we can do automatically.
        callback(false, "Kunde inte läsa av testbildens pixlar (CORS).");
        return;
      }

      if (px === null) {
        callback(false, "Hittade ingen synlig feature i lagrets utbredning.");
        return;
      }

      queryFeatureInfoAt(px, py);
    };

    img.onerror = () => {
      callback(false, "Kunde inte hämta en testbild (GetMap) för lagret.");
    };

    img.src = getMapUrl;
  },

  parseWFSCapabilitesTypes: function (data) {
    var types = [],
      typeElements = $(data).find("FeatureType");

    if (typeElements.length === 0) {
      typeElements = $(data).find("wfs\\:FeatureType");
    }

    typeElements.each((i, featureType) => {
      var projection = "",
        name = "",
        title = "",
        crs = "";

      if ($(featureType).find("DefaultCRS").length > 0) {
        crs = $(featureType).find("DefaultCRS").first().get(0).textContent;
      }
      if ($(featureType).find("DefaultSRS").length > 0) {
        crs = $(featureType).find("DefaultSRS").first().get(0).textContent;
      }
      if ($(featureType).find("wfs\\:DefaultCRS").length > 0) {
        crs = $(featureType)
          .find("wfs\\:DefaultCRS")
          .first()
          .get(0).textContent;
      }
      if ($(featureType).find("wfs\\:DefaultSRS").length > 0) {
        crs = $(featureType)
          .find("wfs\\:DefaultSRS")
          .first()
          .get(0).textContent;
      }
      if (crs && typeof crs === "string") {
        crs = crs.split(":");
      }

      if (Array.isArray(crs)) {
        crs.forEach((part) => {
          if (/EPSG/.test(part)) {
            projection += part + ":";
          }
          if (/^\d+$/.test(Number(part))) {
            projection += part;
          }
        });
      }
      if (!/^[A-Z]+:\d+$/.test(projection)) {
        if (crs.length === 7) {
          projection = crs[4] + ":" + crs[6];
        } else {
          projection = "";
        }
      }

      if ($(featureType).find("Name").length > 0) {
        name = $(featureType).find("Name").first().get(0).textContent;
      }
      if ($(featureType).find("wfs\\:Name").length > 0) {
        name = $(featureType).find("wfs\\:Name").first().get(0).textContent;
      }
      if ($(featureType).find("Title").length > 0) {
        title = $(featureType).find("Title").first().get(0).textContent;
      }
      if ($(featureType).find("wfs\\:Title").length > 0) {
        title = $(featureType).find("wfs\\:Title").first().get(0).textContent;
      }

      types.push({
        name: name,
        title: title,
        projection: projection,
      });
    });
    return types;
  },

  getWFSCapabilities: function (url, callback) {
    $.ajax(prepareProxyUrl(url, this.get("config").url_proxy), {
      data: {
        service: "WFS",
        request: "GetCapabilities",
      },
      success: (data) => {
        var response = this.parseWFSCapabilitesTypes(data);

        if (/MapServer\/WFSServer$/.test(url)) {
          url = url
            .replace("/services/", "/rest/services/")
            .replace("WFSServer", "legend?f=pjson");
          $.ajax(prepareProxyUrl(url, this.get("config").url_proxy), {
            dataType: "json",
            success: (legend) => {
              if (legend && legend.layers && legend.layers[0]) {
                if (legend.layers[0].legend[0]) {
                  response.legend =
                    "data:image/png;base64," +
                    legend.layers[0].legend[0].imageData;
                }
              }
              callback(response);
            },
            error: () => {
              callback(false);
            },
          });
        } else {
          callback(response);
        }
      },
      error: (data) => {
        callback(false);
      },
    });
  },

  getArcGISLayerDescription: function (url, layer, callback) {
    url = prepareProxyUrl(url, this.get("config").url_proxy);
    url += "/" + layer.id;

    $.ajax(url, {
      dataType: "json",
      data: {
        f: "json",
      },
      success: (data) => {
        callback(data);
      },
    });
  },

  getArcGISCapabilities: function (url, callback) {
    $.ajax(prepareProxyUrl(url, this.get("config").url_proxy), {
      dataType: "json",
      data: {
        f: "json",
      },
      success: (data) => {
        callback(data);
      },
      error: (data) => {
        callback(false);
      },
    });
  },

  getAllWMSCapabilities: function (url, versions = defaultVersions, auth) {
    var xmlParser = new X2JS({
      attributePrefix: "",
      arrayAccessFormPaths: [
        "WMS_Capabilities.Capability.Layer.Layer",
        "WMT_MS_Capabilities.Capability.Layer.Layer",
        "WMS_Capabilities.Capability.Layer.Layer.Style",
        "WMT_MS_Capabilities.Capability.Layer.Layer.Style",
      ],
    });

    var parseCapabilities = function (xmlstr) {
      var json = xmlParser.xml2js(xmlstr);

      // WMS_Capabilities or WMT_MS_Capabilities
      // First key in JSON
      var capabilitiesKey = Object.keys(json)[0];
      // A HTML document returned is an error but e.g. dev servers can return this on server found, erroneously with HTTP/200 OK
      if (capabilitiesKey === "html") {
        throw new Error(
          "Server returns HTML instead of expected WMS GetCapabilities response, check contents for e.g. proxy errors"
        );
      }

      return json[capabilitiesKey];
    };

    // If the service requires Basic auth, the browser cannot fetch its
    // capabilities directly (the Authorization header triggers a CORS preflight
    // that authenticated providers won't answer). Route the request through the
    // backend instead, which fetches server-side and returns the raw XML.
    // Unauthenticated services use direct browser fetch.
    if (auth && auth.username) {
      var promises = [];
      var endpoint = this.get("config").url_layers.replace(
        /\/layers\/?$/,
        "/wmscapabilities"
      );

      versions.forEach((version) => {
        promises.push(
          hfetch(endpoint, {
            method: "POST",
            cache: "no-cache",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              url: url,
              version: version,
              username: auth.username,
              password: auth.password,
            }),
          })
            .then((response) => {
              if (!response.ok) {
                throw new Error(
                  "Server-side capabilities request failed (status " +
                    response.status +
                    ")"
                );
              }
              return response.json();
            })
            .then((data) => parseCapabilities(data.xml))
        );
      });

      return Promise.all(promises).then((values) =>
        values.filter(
          (wms, i, self) =>
            self.findIndex((w) => w.version === wms.version) === i
        )
      );
    }

    var promises = [];
    versions.forEach((version) => {
      promises.push(
        $.ajax(prepareProxyUrl(url, this.get("config").url_proxy), {
          data: {
            service: "WMS",
            request: "GetCapabilities",
            version,
          },
        })
      );
    });

    return Promise.all(promises).then((values) => {
      return values
        .map((value) => {
          /*
                    Openlayers can not parse all attributes in GetCapabilities response with WMS lower than 1.3.0, see Github issue.
                    https://github.com/openlayers/openlayers/issues/5476

                    Therefor the XML parser is used instead.
                  */

          var xmlstr =
            typeof value === "string"
              ? value
              : new XMLSerializer().serializeToString(value);
          return parseCapabilities(xmlstr);
        })
        .filter(
          (wms, i, self) =>
            self.findIndex((w) => w.version === wms.version) === i
        );
    });
  },

  getAllWMTSCapabilities: function (url, auth) {
    var xmlParser = new X2JS({
      attributePrefix: "_",
      arrayAccessFormPaths: [
        "Capabilities.Contents.Layer",
        "Capabilities.Contents.Layer.TileMatrixSetLink",
        "Capabilities.Contents.Layer.ResourceURL",
        "Capabilities.Contents.Layer.Style",
        "Capabilities.Contents.Layer.Format",
        "Capabilities.Contents.TileMatrixSet",
        "Capabilities.Contents.TileMatrixSet.TileMatrix",
      ],
    });

    var parseCapabilities = function (xmlstr) {
      var json = xmlParser.xml2js(xmlstr);
      var capabilitiesKey = Object.keys(json)[0];
      if (capabilitiesKey === "html") {
        throw new Error(
          "Server returns HTML instead of expected WMTS GetCapabilities response"
        );
      }
      return json[capabilitiesKey];
    };

    // If the service requires Basic auth, the browser cannot fetch its
    // capabilities directly (the Authorization header triggers a CORS preflight
    // that authenticated providers such as Lantmäteriet won't answer). Route the
    // request through the backend instead, which fetches server-side and returns
    // the raw XML. Unauthenticated services keep the direct browser fetch below.
    if (auth && auth.username) {
      var endpoint = this.get("config").url_layers.replace(
        /\/layers\/?$/,
        "/wmtscapabilities"
      );
      return hfetch(endpoint, {
        method: "POST",
        cache: "no-cache",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: url,
          username: auth.username,
          password: auth.password,
        }),
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error(
              "Server-side capabilities request failed (status " +
                response.status +
                ")"
            );
          }
          return response.json();
        })
        .then((data) => parseCapabilities(data.xml));
    }

    var hasCapabilitiesInUrl = /xml|GetCapabilities/i.test(url);
    var data = hasCapabilitiesInUrl
      ? undefined
      : {
          service: "WMTS",
          request: "GetCapabilities",
          version: "1.0.0",
        };

    return $.ajax(prepareProxyUrl(url, this.get("config").url_proxy), {
      data: data,
    }).then((value) => {
      var xmlstr =
        typeof value === "string"
          ? value
          : new XMLSerializer().serializeToString(value);
      return parseCapabilities(xmlstr);
    });
  },

  getWMSCapabilities: function (url, callback) {
    $.ajax(prepareProxyUrl(url, this.get("config").url_proxy), {
      data: {
        service: "WMS",
        request: "GetCapabilities",
      },
      success: (data) => {
        try {
          var response = new WMSCapabilities().read(data);
          callback(response);
        } catch (e) {
          console.error(e);
          callback(false, e);
        }
      },
      error: (data) => {
        callback(false);
      },
    });
  },
});

export {
  manager as default,
  WMS_VERSION_1_0_0,
  WMS_VERSION_1_1_0,
  WMS_VERSION_1_1_1,
  WMS_VERSION_1_3_0,
};
