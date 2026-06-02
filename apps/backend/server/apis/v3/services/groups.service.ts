import { GroupType, Prisma, UseType } from "@prisma/client";

import log4js from "log4js";
import prisma from "../../../common/prisma.ts";
import {
  activeLayerInstanceWhere,
  layerInstanceIncludeAll,
} from "../utils/layer-instance.ts";

const logger = log4js.getLogger("service.v3.layer");

interface GroupLayerCreateInput {
  layerId: string;
  usage?: UseType;
  infoClickActive?: boolean;
  visibleAtStart?: boolean;
  zIndex?: number;
  options?: Prisma.InputJsonValue;
}

interface GroupCreateData extends Omit<Prisma.GroupCreateInput, "layers"> {
  layers?: GroupLayerCreateInput[];
  type?: GroupType;
}

class GroupsService {
  constructor() {
    logger.debug("Initiating Groups Service");
  }

  async getGroups() {
    return await prisma.group.findMany({ orderBy: { name: "asc" } });
  }

  async getGroupById(id: string) {
    const group = await prisma.group.findUnique({
      where: { id },
    });

    return group;
  }

  async getLayersByGroupId(id: string) {
    const instances = await prisma.layerInstance.findMany({
      where: {
        AND: [{ groupId: id }, activeLayerInstanceWhere],
      },
      include: layerInstanceIncludeAll,
    });

    return instances
      .map((instance) => {
        if (instance.displayLayer) {
          return { ...instance.displayLayer, layerKind: "display" as const };
        }
        if (instance.searchLayer) {
          return { ...instance.searchLayer, layerKind: "search" as const };
        }
        if (instance.editingLayer) {
          return { ...instance.editingLayer, layerKind: "editing" as const };
        }
        return null;
      })
      .filter((layer): layer is NonNullable<typeof layer> => layer !== null);
  }

  async getMapsByGroupId(id: string) {
    const maps = await prisma.map.findMany({
      select: {
        id: true,
        name: true,
      },
      where: { groups: { some: { groupId: id } } },
    });

    return maps;
  }
  async createGroup(data: GroupCreateData, userId?: string) {
    const { layers = [], ...groupData } = data;
    const groupType = groupData.type ?? GroupType.Layer;
    const layerInstances = layers.map((layer) => ({
      usage: layer.usage ?? UseType.FOREGROUND,
      infoClickActive: layer.infoClickActive ?? true,
      visibleAtStart: layer.visibleAtStart ?? false,
      zIndex: layer.zIndex ?? 0,
      options: layer.options ?? {},
      ...(groupType === GroupType.Search
        ? { searchLayerId: layer.layerId }
        : { displayLayerId: layer.layerId }),
    }));

    return await prisma.group.create({
      data: {
        ...groupData,
        createdBy: userId,
        createdDate: new Date(),
        lastSavedBy: userId,
        lastSavedDate: new Date(),
        ...(layerInstances.length > 0 && {
          layers: { create: layerInstances },
        }),
      },
    });
  }
  async updateGroup(
    id: string,
    data: Prisma.GroupUpdateInput,
    userId?: string
  ) {
    return await prisma.group.update({
      where: { id },
      data: {
        ...data,
        lastSavedBy: userId,
        lastSavedDate: new Date(),
      },
    });
  }
  async deleteGroup(id: string) {
    return await prisma.group.delete({
      where: { id },
    });
  }
}

export default new GroupsService();
