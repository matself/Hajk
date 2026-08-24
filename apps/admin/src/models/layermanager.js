import X2JS from "x2js";
import { Model } from "backbone";
import WMSCapabilities from "ol/format/WMSCapabilities";
import $ from "jquery";
import { prepareProxyUrl } from "../utils/ProxyHelper";
import { hfetch } from "utils/FetchWrapper";
import { parseCapabilities, requestError } from "../utils/CapabilitiesParser";

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

/**
 * A capabilities response may arrive as an XML Document (jQuery parses it when
 * the service sets an XML content type) or as a plain string. The parser wants
 * a string.
 */
function asXmlString(value) {
  return typeof value === "string"
    ? value
    : new XMLSerializer().serializeToString(value);
}

/**
 * Reads the backend's answer from the server-side capabilities endpoints. On
 * failure it sends the reason as a plain-text body, which is far more useful
 * than the status code alone.
 */
function readBackendResponse(response) {
  if (response.ok) {
    return response.json();
  }
  return response.text().then((body) => {
    throw new Error(
      body && body.trim()
        ? body.trim()
        : "Hämtningen via servern misslyckades (HTTP " + response.status + ")."
    );
  });
}

/**
 * Settles a list of promises without letting one failure discard the others -
 * the versions are queried in parallel and a service that answers some of them
 * and rejects the rest is still perfectly usable. Resolves with the successful
 * values, and only rejects when every single request failed.
 */
function collectSuccessful(promises) {
  return Promise.all(
    promises.map((p) =>
      p.then(
        (value) => ({ ok: true, value }),
        (error) => ({ ok: false, error })
      )
    )
  ).then((results) => {
    var succeeded = results.filter((r) => r.ok).map((r) => r.value);
    if (succeeded.length === 0) {
      throw results[0].error;
    }
    return succeeded;
  });
}

function uniqueByVersion(item, i, self) {
  return self.findIndex((other) => other.version === item.version) === i;
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
    var parse = function (xmlstr) {
      return parseCapabilities(xmlstr, "wms");
    };

    // If the service requires Basic auth, the browser cannot fetch its
    // capabilities directly (the Authorization header triggers a CORS preflight
    // that authenticated providers won't answer). Route the request through the
    // backend instead, which fetches server-side and returns the raw XML.
    // Unauthenticated services use direct browser fetch.
    if (auth && auth.username) {
      var endpoint = this.get("config").url_layers.replace(
        /\/layers\/?$/,
        "/wmscapabilities"
      );

      var authPromises = versions.map((version) =>
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
          .then(readBackendResponse)
          .then((data) => parse(data.xml))
      );

      return collectSuccessful(authPromises).then((values) =>
        values.filter(uniqueByVersion)
      );
    }

    /*
      Openlayers can not parse all attributes in GetCapabilities response with
      WMS lower than 1.3.0, see Github issue.
      https://github.com/openlayers/openlayers/issues/5476

      Therefor the XML parser is used instead.
    */
    var promises = versions.map((version) =>
      Promise.resolve(
        $.ajax(prepareProxyUrl(url, this.get("config").url_proxy), {
          data: {
            service: "WMS",
            request: "GetCapabilities",
            version,
          },
        })
      ).then(
        (value) => parse(asXmlString(value)),
        (jqXHR) => {
          throw requestError(jqXHR);
        }
      )
    );

    return collectSuccessful(promises).then((values) =>
      values.filter(uniqueByVersion)
    );
  },

  getAllWMTSCapabilities: function (url, auth) {
    var parse = function (xmlstr) {
      return parseCapabilities(xmlstr, "wmts");
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
        .then(readBackendResponse)
        .then((data) => parse(data.xml));
    }

    var hasCapabilitiesInUrl = /xml|GetCapabilities/i.test(url);
    var data = hasCapabilitiesInUrl
      ? undefined
      : {
          service: "WMTS",
          request: "GetCapabilities",
          version: "1.0.0",
        };

    return Promise.resolve(
      $.ajax(prepareProxyUrl(url, this.get("config").url_proxy), {
        data: data,
      })
    ).then(
      (value) => parse(asXmlString(value)),
      (jqXHR) => {
        throw requestError(jqXHR);
      }
    );
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
