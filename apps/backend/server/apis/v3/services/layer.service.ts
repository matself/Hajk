import { Prisma } from "@prisma/client";

import { ServiceType } from "@prisma/client";
import log4js from "log4js";

import prisma from "../../../common/prisma.ts";
import { HajkError } from "../../../common/classes.ts";
import HajkStatusCodes from "../../../common/hajk-status-codes.ts";
import HttpStatusCodes from "../../../common/http-status-codes.ts";

const logger = log4js.getLogger("service.v3.layer");

class LayerService {
  constructor() {
    logger.debug("Initiating Layer Service");
  }

  async getLayers() {
    return await prisma.layer.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
    });
  }

  async getLayerById(id: string) {
    const layer = await prisma.layer.findUnique({
      where: { id },
      include: {
        metadata: true,
        infoClickSettings: true,
        searchSettings: true,
      },
    });

    if (layer?.deletedAt) {
      return null;
    }

    return layer;
  }

  async getLayerTypes() {
    return Object.values(ServiceType);
  }

  async getLayersByType(type: ServiceType) {
    return await prisma.layer.findMany({
      where: { deletedAt: null, service: { type, deletedAt: null } },
    });
  }

  async getServiceByLayerId(id: string) {
    const service = await prisma.layer.findUnique({
      where: { id },
      include: { service: true },
    });

    if (service?.deletedAt || service?.service?.deletedAt) {
      return null;
    }

    return service?.service;
  }

  async createLayer(
    data: Prisma.LayerCreateInput & { serviceId: string },
    userId?: string
  ) {
    const { serviceId, ...layerData } = data;

    const newLayer = await prisma.layer.create({
      data: {
        ...layerData,
        createdBy: userId,
        createdDate: new Date(),
        service: { connect: { id: serviceId } },
        metadata: { create: { ...layerData.metadata } },
        infoClickSettings: { create: { ...layerData.infoClickSettings } },
        searchSettings: { create: { ...layerData.searchSettings } },
      },
    });

    return newLayer;
  }

  async updateLayer(
    id: string,
    data: Prisma.LayerUpdateInput & { serviceId: string },
    userId?: string
  ) {
    const { serviceId, options, ...layerData } = data;

    const existingLayer = await prisma.layer.findUnique({
      where: { id },
      select: { options: true },
    });

    const existingOptions = (existingLayer?.options as object) || {};
    const updatedOptions = {
      ...(existingOptions as object),
      ...(options as object),
    };
    const updatedLayer = await prisma.layer.update({
      where: { id },
      data: {
        ...layerData,
        lastSavedBy: userId,
        lastSavedDate: new Date(),
        options: updatedOptions,
        service: { connect: { id: serviceId } },
        metadata: {
          upsert: {
            update: { ...layerData.metadata },
            create: { ...layerData.metadata },
          },
        },
        searchSettings: {
          upsert: {
            update: { ...layerData.searchSettings },
            create: { ...layerData.searchSettings },
          },
        },
        infoClickSettings: {
          upsert: {
            update: { ...layerData.infoClickSettings },
            create: { ...layerData.infoClickSettings },
          },
        },
      },

      include: {
        service: true,
        metadata: true,
        searchSettings: true,
        infoClickSettings: true,
      },
    });
    return updatedLayer;
  }

  async deleteLayer(id: string) {
    await prisma.$transaction(async (transaction) => {
      await this.deleteLayerInTransaction(transaction, id);
    });
  }

  async deleteLayerInTransaction(
    transaction: Prisma.TransactionClient,
    id: string
  ) {
    const layer = await transaction.layer.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        metadataId: true,
        searchSettingsId: true,
        infoClickSettingsId: true,
      },
    });

    if (!layer) {
      throw new HajkError(
        HttpStatusCodes.NOT_FOUND,
        `No layer with id: ${id} could be found.`,
        HajkStatusCodes.UNKNOWN_LAYER_ID
      );
    }

    await transaction.layerInstance.deleteMany({ where: { layerId: id } });

    await transaction.roleOnLayer.deleteMany({ where: { layerId: id } });

    const deletedAt = new Date();

    await transaction.layer.updateMany({
      where: { id, deletedAt: null },
      data: {
        deletedAt,
        lastSavedDate: deletedAt,
        metadataId: null,
        searchSettingsId: null,
        infoClickSettingsId: null,
      },
    });

    if (layer.metadataId) {
      await transaction.metadata.deleteMany({
        where: { id: layer.metadataId },
      });
    }

    if (layer.searchSettingsId) {
      await transaction.searchSettings.deleteMany({
        where: { id: layer.searchSettingsId },
      });
    }

    if (layer.infoClickSettingsId) {
      await transaction.infoClickSettings.deleteMany({
        where: { id: layer.infoClickSettingsId },
      });
    }
  }

  async getUsageByLayerId(id: string) {
    return await prisma.layerInstance.findMany({
      where: { layerId: id, layer: { deletedAt: null } },
      select: {
        id: true,
        usage: true,
        map: { select: { id: true, name: true } },
        group: {
          select: {
            id: true,
            name: true,
            maps: { select: { mapName: true } },
          },
        },
      },
    });
  }

  async getRoleOnLayerByLayerId(layerId: string) {
    return prisma.roleOnLayer.findFirst({
      where: { layerId },
      include: {
        role: true,
      },
    });
  }

  async createAndUpdateRoleOnLayer(
    data: Prisma.RoleOnLayerCreateInput & { layerId: string; roleId: string }
  ) {
    const existingEntry = await prisma.roleOnLayer.findFirst({
      where: { layerId: data.layerId },
    });

    if (existingEntry) {
      return await prisma.roleOnLayer.update({
        where: {
          layerId: data.layerId,
        },
        data: {
          roleId: data.roleId,
        },
      });
    }

    return await prisma.roleOnLayer.create({
      data: {
        layerId: data.layerId,
        roleId: data.roleId,
      },
    });
  }
}

export default new LayerService();
