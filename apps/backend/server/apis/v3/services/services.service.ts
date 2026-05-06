import { Prisma } from "@prisma/client";
import log4js from "log4js";

import prisma from "../../../common/prisma.ts";
import { HajkError } from "../../../common/classes.ts";
import HajkStatusCodes from "../../../common/hajk-status-codes.ts";
import HttpStatusCodes from "../../../common/http-status-codes.ts";

const logger = log4js.getLogger("service.v3.layer");
const DEFAULT_PROJECTION_CODE = "EPSG:3006";
class ServicesService {
  constructor() {
    logger.debug("Initiating Services Service");
  }

  async getServices() {
    // Get all services and the sum of layers
    // per each service
    const services = await prisma.service.findMany({
      where: { deletedAt: null },
      include: {
        // select all columns in the service table
        metadata: true,
        projection: true,
        _count: {
          select: {
            layers: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return services;
  }

  async getServiceById(id: string) {
    const service = await prisma.service.findUnique({
      where: { id },
      include: { metadata: true, projection: true },
    });

    if (service?.deletedAt) {
      return null;
    }

    return service;
  }

  async getLayersByServiceId(id: string) {
    const layers = await prisma.layer.findMany({
      where: { serviceId: id, deletedAt: null },
    });

    return layers;
  }

  // Get all maps that use a layer or a group that uses a layer
  // that belongs to the service
  async getMapsByServiceId(id: string) {
    const maps = await prisma.map.findMany({
      select: {
        id: true,
        name: true,
      },
      where: {
        OR: [
          {
            layers: {
              some: {
                layer: {
                  serviceId: id,
                  deletedAt: null,
                },
              },
            },
          },
          {
            groups: {
              some: {
                group: {
                  layers: {
                    some: {
                      layer: {
                        serviceId: id,
                        deletedAt: null,
                      },
                    },
                  },
                },
              },
            },
          },
        ],
      },
    });

    return maps;
  }

  async getGroupsByServiceId(id: string) {
    return await prisma.group.findMany({
      select: { id: true, name: true },
      where: {
        layers: {
          some: {
            layer: { serviceId: id, deletedAt: null },
          },
        },
      },
      orderBy: { name: "asc" },
    });
  }

  async getAllProjections() {
    const projections = await prisma.projection.findMany();

    return projections;
  }

  async getCapabilities(url: string, type: string) {
    let parsedUrl: URL;

    try {
      parsedUrl = new URL(url);
    } catch {
      throw new HajkError(
        HttpStatusCodes.BAD_REQUEST,
        "Invalid service URL",
        HajkStatusCodes.INVALID_REQUEST_BODY
      );
    }

    if (!type?.trim()) {
      throw new HajkError(
        HttpStatusCodes.BAD_REQUEST,
        "Service type is required",
        HajkStatusCodes.INVALID_REQUEST_BODY
      );
    }

    const separator = parsedUrl.search ? "&" : "?";
    const capabilitiesUrl = `${url}${separator}service=${encodeURIComponent(type)}&request=GetCapabilities`;

    try {
      const response = await fetch(capabilitiesUrl, {
        method: "GET",
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        throw new HajkError(
          HttpStatusCodes.BAD_GATEWAY,
          `External service returned ${response.status} ${response.statusText} for GetCapabilities`,
          HajkStatusCodes.EXTERNAL_SERVICE_CAPABILITIES_FAILED
        );
      }

      const capabilities = await response.text();
      if (!capabilities.trim()) {
        throw new HajkError(
          HttpStatusCodes.BAD_GATEWAY,
          "External service returned an empty GetCapabilities response",
          HajkStatusCodes.EXTERNAL_SERVICE_CAPABILITIES_FAILED
        );
      }

      return { capabilities, url: capabilitiesUrl };
    } catch (error) {
      if (error instanceof HajkError) {
        throw error;
      }

      const isTimeout =
        error instanceof Error &&
        (error.name === "TimeoutError" || error.name === "AbortError");

      throw new HajkError(
        isTimeout
          ? HttpStatusCodes.GATEWAY_TIMEOUT
          : HttpStatusCodes.BAD_GATEWAY,
        isTimeout
          ? "External service timed out during GetCapabilities request"
          : "Failed to fetch GetCapabilities from external service",
        HajkStatusCodes.EXTERNAL_SERVICE_CAPABILITIES_FAILED
      );
    }
  }

  async createService(
    data: Prisma.ServiceCreateInput & {
      projection?: { code: string };
      metadata?: Record<string, unknown>;
    },
    userId?: string
  ) {
    const projectionCode = data?.projection?.code || DEFAULT_PROJECTION_CODE;
    const existingProjection = await prisma.projection.findUnique({
      where: { code: projectionCode },
    });

    if (!existingProjection) {
      throw new Error(`Projection with code ${projectionCode} not found`);
    }

    // Transform user input to Prisma format
    const { metadata, ...serviceData } = data;
    try {
      const newService = await prisma.service.create({
        data: {
          ...serviceData,
          createdBy: userId,
          createdDate: new Date(),
          metadata: metadata
            ? {
                create: metadata,
              }
            : undefined,
          projection: {
            connect: { id: existingProjection.id },
          },
        },
        include: {
          metadata: true,
          projection: true,
        },
      });

      return newService;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new HajkError(
          HttpStatusCodes.CONFLICT,
          "Could not create service: a unique data constraint was violated",
          HajkStatusCodes.SERVICE_ALREADY_EXISTS
        );
      }
      throw error;
    }
  }

  async updateService(
    id: string,
    data: Prisma.ServiceUpdateInput & {
      projection?: { code: string };
      metadata?: Record<string, unknown>;
    },
    userId?: string
  ) {
    // Transform user input to Prisma format
    const { projection, metadata, ...serviceData } = data;

    // Build the update data object conditionally
    const updateData: Record<string, unknown> = {
      ...serviceData,
      lastSavedBy: userId,
      lastSavedDate: new Date(),
    };

    // Handle projection update
    if (projection?.code) {
      const existingProjection = await prisma.projection.findUnique({
        where: { code: projection.code },
      });

      if (!existingProjection) {
        throw new Error(`Projection with code ${projection.code} not found`);
      }

      updateData.projection = {
        connect: { id: existingProjection.id },
      };
    }

    // Handle metadata update
    if (metadata) {
      updateData.metadata = {
        upsert: {
          update: metadata,
          create: metadata,
        },
      };
    }

    const updatedService = await prisma.service.update({
      where: { id },
      data: updateData,
      include: {
        metadata: true,
        projection: true,
      },
    });
    return updatedService;
  }

  async updateHealthStatus(
    id: string,
    healthStatus: "HEALTHY" | "UNHEALTHY"
  ) {
    return await prisma.service.update({
      where: { id },
      data: {
        healthStatus,
        healthCheckedAt: new Date(),
      },
    });
  }

  async deleteService(id: string) {
    await prisma.$transaction(async (transaction) => {
      const service = await transaction.service.findFirst({
        where: { id, deletedAt: null },
        select: { id: true },
      });

      if (!service) {
        throw new HajkError(
          HttpStatusCodes.NOT_FOUND,
          `No service with id: ${id} could be found.`,
          HajkStatusCodes.UNKNOWN_SERVICE_ID
        );
      }

      const layerInstanceCount = await transaction.layerInstance.count({
        where: {
          layer: {
            serviceId: id,
            deletedAt: null,
          },
        },
      });

      if (layerInstanceCount > 0) {
        throw new HajkError(
          HttpStatusCodes.CONFLICT,
          "Cannot delete service because its layers are still referenced.",
          HajkStatusCodes.SERVICE_DELETE_BLOCKED_BY_REFERENCES
        );
      }

      const deletedAt = new Date();

      await transaction.layer.updateMany({
        where: { serviceId: id, deletedAt: null },
        data: { deletedAt, lastSavedDate: deletedAt },
      });

      await transaction.service.updateMany({
        where: { id, deletedAt: null },
        data: { deletedAt, lastSavedDate: deletedAt },
      });
    });
  }
}

export default new ServicesService();
