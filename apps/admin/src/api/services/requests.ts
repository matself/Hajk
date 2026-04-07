import axios from "axios";
import { getApiClient, InternalApiError } from "../../lib/internal-api-client";
import {
  Service,
  ServicesApiResponse,
  ServiceCreateInput,
  ServiceUpdateInput,
  ServiceCapabilities,
  SERVICE_STATUS,
} from "./types";
import { LayersApiResponse } from "../layers";
import { Map } from "../maps";
import { GlobalMapsApiResponse } from "../tools";
import useAppStateStore from "../../store/use-app-state-store";

/**
 * This module provides API request functions to interact with the backend
 * services for fetching data related to services.
 *
 * - The `getServices` function retrieves a list of all services.
 * - The `getServiceById` function fetches details of a specific service by its ID.
 * - The `getLayersByServiceId` function retrieves all layers linked to a given service ID.
 * - The `getMapsByServiceId` function fetches all maps linked to a given service ID.
 * - The ´createService` function creates a new service.
 * - The `updateService` function updates a service.
 * - The `deleteService` function deletes a service.
 * - The parseLayersFromXML function parses layer names from an XML string.
 * - The fetchCapabilities function fetches getCapabilities for a given URL.
 *
 * These functions utilize a custom Axios instance and throw appropriate error messages for failures.
 *
 * All functions return a Promise with the expected data format or throw an error in case of failure.
 */

export const getServices = async (): Promise<Service[]> => {
  const internalApiClient = getApiClient();
  try {
    const response =
      await internalApiClient.get<ServicesApiResponse>("/services");
    if (!response.data) {
      throw new Error("No services data found");
    }
    return response.data.services;
  } catch (error) {
    const axiosError = error as InternalApiError;
    if (axiosError.response) {
      throw new Error(
        `Failed to fetch services. ErrorId: ${axiosError.response.data.errorId}.`,
      );
    } else {
      throw new Error("Failed to fetch services");
    }
  }
};

export const getServiceById = async (serviceId: string): Promise<Service> => {
  const internalApiClient = getApiClient();
  try {
    const response = await internalApiClient.get<Service>(
      `/services/${serviceId}`,
    );
    if (!response.data) {
      throw new Error("No service data found");
    }
    return response.data;
  } catch (error) {
    const axiosError = error as InternalApiError;
    if (axiosError.response) {
      throw new Error(
        `Failed to fetch service. ErrorId: ${axiosError.response.data.errorId}.`,
      );
    } else {
      throw new Error("Failed to fetch service");
    }
  }
};

export const getLayersByServiceId = async (
  serviceId: string,
): Promise<LayersApiResponse> => {
  const internalApiClient = getApiClient();
  try {
    const response = await internalApiClient.get<LayersApiResponse>(
      `/services/${serviceId}/layers`,
    );
    if (!response.data) {
      throw new Error("No layers data found");
    }
    return response.data;
  } catch (error) {
    const axiosError = error as InternalApiError;
    if (axiosError.response) {
      throw new Error(
        `Failed to fetch layers. ErrorId: ${axiosError.response.data.errorId}.`,
      );
    } else {
      throw new Error("Failed to fetch layers");
    }
  }
};

export const getMapsByServiceId = async (serviceId: string): Promise<Map[]> => {
  const internalApiClient = getApiClient();
  try {
    const response = await internalApiClient.get<GlobalMapsApiResponse>(
      `/services/${serviceId}/maps`,
    );

    if (!response.data) {
      throw new Error("No maps data found");
    }

    return response.data.maps;
  } catch (error) {
    const axiosError = error as InternalApiError;
    if (axiosError.response) {
      throw new Error(
        `Failed to fetch maps. ErrorId: ${axiosError.response.data.errorId}.`,
      );
    } else {
      throw new Error("Failed to fetch maps");
    }
  }
};

export const getAllProjections = async (): Promise<string[]> => {
  const internalApiClient = getApiClient();
  try {
    const response = await internalApiClient.get<{ projections: string[] }>(
      "/services/projections",
    );
    if (!response.data) {
      throw new Error("No projections data found");
    }
    return response.data.projections;
  } catch (error) {
    const axiosError = error as InternalApiError;
    if (axiosError.response) {
      throw new Error(
        `Failed to fetch projections. ErrorId: ${axiosError.response.data.errorId}.`,
      );
    } else {
      throw new Error("Failed to fetch projections");
    }
  }
};

/** Aligns with backend default when config has no projection (see services.service.ts). */
const CREATE_SERVICE_PROJECTION_FALLBACK = "EPSG:3006";

/**
 * Builds the JSON body for `POST /services` (admin API base includes `/api/v3`).
 * Merges `servicesDefault` from config.json with user input and ensures
 * `projection.code` when missing (backend Zod requires projection).
 */
function buildCreateServicePayload(
  input: ServiceCreateInput,
): Record<string, unknown> {
  const { servicesDefault, defaultCoordinates } = useAppStateStore.getState();

  const merged: Record<string, unknown> = {
    ...servicesDefault,
    ...input,
  };

  const projection = merged.projection as { code?: string } | undefined;
  const code = projection?.code?.trim();
  if (!code) {
    const first = defaultCoordinates?.[0];
    merged.projection = {
      code:
        typeof first === "string" && first.trim()
          ? first.trim()
          : CREATE_SERVICE_PROJECTION_FALLBACK,
    };
  }

  return merged;
}

/**
 * Creates a service via backend `POST /services`.
 * On 4xx/5xx, rejects with the Axios error so callers can read `response.data` (e.g. Zod details).
 */
export const createService = async (
  newService: ServiceCreateInput,
): Promise<Service> => {
  const internalApiClient = getApiClient();
  const serviceData = buildCreateServicePayload(newService);

  try {
    const response = await internalApiClient.post<Service>(
      "/services",
      serviceData,
    );
    if (!response.data) {
      throw new Error("No service data found");
    }
    return response.data;
  } catch (error) {
    const axiosError = error as InternalApiError;
    if (axiosError.response) {
      throw axiosError;
    } else {
      throw new Error("Failed to create service");
    }
  }
};

export const updateService = async (
  serviceId: string,
  data: Partial<ServiceUpdateInput>,
): Promise<ServiceUpdateInput> => {
  const internalApiClient = getApiClient();
  try {
    const response = await internalApiClient.patch<ServiceUpdateInput>(
      `/services/${serviceId}`,
      data,
    );
    if (!response.data) {
      throw new Error("No service data found");
    }
    return response.data;
  } catch (error) {
    const axiosError = error as InternalApiError;
    if (axiosError.response) {
      throw new Error(
        `Failed to update service. ErrorId: ${axiosError.response.data.errorId}.`,
      );
    } else {
      throw new Error("Failed to update service");
    }
  }
};

export const deleteService = async (serviceId: string): Promise<void> => {
  const internalApiClient = getApiClient();
  try {
    await internalApiClient.delete(`/services/${serviceId}`);
  } catch (error) {
    const axiosError = error as InternalApiError;
    if (axiosError.response) {
      throw new Error(
        `Failed to delete service. ErrorId: ${axiosError.response.data.errorId}.`,
      );
    } else {
      throw new Error("Failed to delete service");
    }
  }
};

const parseCapabilitiesFromXML = (xmlString: string): ServiceCapabilities => {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, "application/xml");

  const layerNames: string[] = [];
  const layerElements = xmlDoc.getElementsByTagName("Name");

  const layers = xmlDoc.getElementsByTagName("Layer");
  const workspaces: Set<string> = new Set<string>();
  const styles: Record<string, { name: string; legendUrl?: string }[]> = {};

  for (const layer of layers) {
    const name = layer.getElementsByTagName("Name")[0]?.textContent;
    if (name?.includes(":")) {
      const workspace = name.split(":")[0];
      workspaces.add(workspace);
    }
    const styleElements = layer.getElementsByTagName("Style");
    const styleData: { name: string; legendUrl?: string }[] = [];

    for (const styleElement of styleElements) {
      const styleName =
        styleElement.getElementsByTagName("Name")[0]?.textContent;
      const legendElement = styleElement.getElementsByTagName("LegendURL")[0];
      const legendUrl = legendElement
        ?.getElementsByTagName("OnlineResource")[0]
        ?.getAttribute("xlink:href");
      if (styleName) {
        styleData.push({ name: styleName, legendUrl: legendUrl ?? undefined });
      }
    }
    if (name) {
      styles[name] = styleData;
    }
  }
  for (const layerElement of layerElements) {
    const layerName = layerElement.textContent;
    if (layerName) {
      layerNames.push(layerName);
    }
  }

  return {
    layers: layerNames,
    workspaces: Array.from(workspaces),
    styles,
  };
};

export const fetchCapabilities = async (
  url: string,
): Promise<ServiceCapabilities> => {
  const response = await axios.get(url, { responseType: "text" });
  const xmlData: string = response.data as string;
  const layers = parseCapabilitiesFromXML(xmlData);
  return { ...layers };
};

export const checkServiceHealth = async (
  service: Service,
  updateCache: (id: string, status: SERVICE_STATUS) => void,
) => {
  try {
    const healthUrl = ["WMS", "WMTS"].includes(service.type)
      ? `${service.url}?service=${service.type}`
      : `${service.url}?service=WFS&request=GetFeature&maxFeatures=1`;
    const response = await fetch(healthUrl, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });
    const status = response.ok
      ? SERVICE_STATUS.HEALTHY
      : SERVICE_STATUS.UNHEALTHY;
    updateCache(service.id, status);
  } catch {
    updateCache(service.id, SERVICE_STATUS.UNHEALTHY);
  }
};
