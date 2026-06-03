import { GroupType, Prisma, UseType } from "@prisma/client";

import log4js from "log4js";
import prisma from "../../../common/prisma.ts";
import {
  activeLayerInstanceWhere,
  layerInstanceIncludeAll,
} from "../utils/layer-instance.ts";

const logger = log4js.getLogger("service.v3.layer");

export type LayerSwitcherTreeNode =
  | { type: "layer"; id: string }
  | { type: "group"; id: string; name: string; children: LayerSwitcherTreeNode[] };

const LAYER_SWITCHER_TREE_OPTIONS_KEY = "layerSwitcherTree";

function omitLayerSwitcherTree(
  options: Record<string, unknown>
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(options).filter(
      ([key]) => key !== LAYER_SWITCHER_TREE_OPTIONS_KEY
    )
  );
}

interface GroupLayerInput {
  layerId: string;
  usage?: UseType;
  infoClickActive?: boolean;
  visibleAtStart?: boolean;
  zIndex?: number;
  options?: Prisma.InputJsonValue;
}

interface RoleOnGroupInput {
  roleId: string;
}

interface GroupWriteData
  extends Omit<Prisma.GroupCreateInput, "layers" | "restrictedToRoles"> {
  layers?: GroupLayerInput[];
  layerSwitcherTree?: LayerSwitcherTreeNode[];
  restrictedToRoles?: RoleOnGroupInput[];
  type?: GroupType;
}

function extractLayerSwitcherTree(
  options: Prisma.JsonValue | null | undefined
): LayerSwitcherTreeNode[] | undefined {
  if (!options || typeof options !== "object" || Array.isArray(options)) {
    return undefined;
  }
  const tree = (options as Record<string, unknown>)[
    LAYER_SWITCHER_TREE_OPTIONS_KEY
  ];
  return Array.isArray(tree) ? (tree as LayerSwitcherTreeNode[]) : undefined;
}

function buildLayerInstanceOptions(
  layer: GroupLayerInput,
  index: number,
  layerSwitcherTree?: LayerSwitcherTreeNode[]
): Prisma.InputJsonValue {
  const base =
    layer.options && typeof layer.options === "object" && !Array.isArray(layer.options)
      ? { ...(layer.options as Record<string, unknown>) }
      : {};

  if (index === 0 && layerSwitcherTree?.length) {
    return {
      ...base,
      [LAYER_SWITCHER_TREE_OPTIONS_KEY]: layerSwitcherTree,
    };
  }

  if (LAYER_SWITCHER_TREE_OPTIONS_KEY in base) {
    return omitLayerSwitcherTree(base);
  }

  return base;
}

const buildLayerInstances = (
  layers: GroupLayerInput[],
  groupType: GroupType,
  layerSwitcherTree?: LayerSwitcherTreeNode[]
) =>
  layers.map((layer, index) => ({
    usage: layer.usage ?? UseType.FOREGROUND,
    infoClickActive: layer.infoClickActive ?? true,
    visibleAtStart: layer.visibleAtStart ?? false,
    zIndex: layer.zIndex ?? index,
    options: buildLayerInstanceOptions(layer, index, layerSwitcherTree),
    ...(groupType === GroupType.Search
      ? { searchLayerId: layer.layerId }
      : { displayLayerId: layer.layerId }),
  }));

const buildRoleConnections = (roles: RoleOnGroupInput[]) =>
  roles.map((role) => ({
    role: { connect: { id: role.roleId } },
  }));

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
      include: {
        restrictedToRoles: {
          include: { role: true },
        },
      },
    });

    return group;
  }

  async getLayersByGroupId(id: string) {
    const instances = await prisma.layerInstance.findMany({
      where: {
        AND: [{ groupId: id }, activeLayerInstanceWhere],
      },
      include: layerInstanceIncludeAll,
      orderBy: { zIndex: "asc" },
    });

    let layerSwitcherTree: LayerSwitcherTreeNode[] | undefined;

    for (const instance of instances) {
      const tree = extractLayerSwitcherTree(instance.options);
      if (tree?.length) {
        layerSwitcherTree = tree;
        break;
      }
    }

    const layers = instances
      .map((instance) => {

        const placementOptions =
          instance.options &&
          typeof instance.options === "object" &&
          !Array.isArray(instance.options)
            ? { ...(instance.options as Record<string, unknown>) }
            : {};

        const cleanedPlacementOptions = omitLayerSwitcherTree(placementOptions);

        const baseLayer = instance.displayLayer
          ? { ...instance.displayLayer, layerKind: "display" as const }
          : instance.searchLayer
            ? { ...instance.searchLayer, layerKind: "search" as const }
            : instance.editingLayer
              ? { ...instance.editingLayer, layerKind: "editing" as const }
              : null;

        if (!baseLayer) return null;

        return {
          ...baseLayer,
          drawOrder: instance.zIndex,
          visibleAtStart: instance.visibleAtStart,
          placementOptions: cleanedPlacementOptions,
        };
      })
      .filter((layer): layer is NonNullable<typeof layer> => layer !== null);

    return { layers, layerSwitcherTree };
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
  async createGroup(data: GroupWriteData, userId?: string) {
    const {
      layers = [],
      layerSwitcherTree,
      restrictedToRoles = [],
      ...groupData
    } = data;
    const groupType = groupData.type ?? GroupType.Layer;
    const layerInstances = buildLayerInstances(
      layers,
      groupType,
      layerSwitcherTree
    );
    const roleConnections = buildRoleConnections(restrictedToRoles);

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
        ...(roleConnections.length > 0 && {
          restrictedToRoles: { create: roleConnections },
        }),
      },
    });
  }
  async updateGroup(
    id: string,
    data: GroupWriteData,
    userId?: string
  ) {
    const { layers, layerSwitcherTree, restrictedToRoles, ...groupData } = data;
    const existingGroup =
      layers !== undefined
        ? await prisma.group.findUnique({ where: { id } })
        : null;
    const groupType =
      groupData.type ?? existingGroup?.type ?? GroupType.Layer;
    const layerInstances =
      layers !== undefined
        ? buildLayerInstances(layers, groupType, layerSwitcherTree)
        : undefined;
    const roleConnections =
      restrictedToRoles !== undefined
        ? buildRoleConnections(restrictedToRoles)
        : undefined;

    return await prisma.group.update({
      where: { id },
      data: {
        ...groupData,
        lastSavedBy: userId,
        lastSavedDate: new Date(),
        ...(layerInstances !== undefined && {
          layers: {
            deleteMany: {},
            create: layerInstances,
          },
        }),
        ...(roleConnections !== undefined && {
          restrictedToRoles: {
            deleteMany: {},
            create: roleConnections,
          },
        }),
      },
      include: {
        restrictedToRoles: {
          include: { role: true },
        },
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
