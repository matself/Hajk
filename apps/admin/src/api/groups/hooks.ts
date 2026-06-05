import {
  useQuery,
  UseQueryResult,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  getGroups,
  getGroupById,
  getLayersByGroupId,
  getMapsByGroupId,
  createGroup,
  updateGroup,
  updateGroupLayers,
  deleteGroup,
} from "./requests";
import {
  Group,
  GroupLayersApiResponse,
  GroupLayersUpdateInput,
  GroupUpdateInput,
} from "./types";
import { Map } from "../maps";

// A React Query hook to fetch groups
// This hook uses the `getGroups` function from the groups `requests` module
export const useGroups = (): UseQueryResult<Group[]> => {
  return useQuery({
    queryKey: ["groups"],
    queryFn: getGroups,
  });
};

// A React Query hook to fetch a group by id
// This hook uses the `getGroupById` function from the groups `requests` module
export const useGroupById = (groupId: string): UseQueryResult<Group> => {
  return useQuery({
    queryKey: ["groups", groupId],
    queryFn: () => getGroupById(groupId),
    enabled: Boolean(groupId),
  });
};

// A React Query hook to fetch layers by group id
// This hook uses the `getLayersByGroupId` function from the groups `requests` module
export const useLayersByGroupId = (
  groupId: string
): UseQueryResult<GroupLayersApiResponse> => {
  return useQuery({
    queryKey: ["layersByGroupId", groupId],
    queryFn: () => getLayersByGroupId(groupId),
    enabled: Boolean(groupId),
  });
};

// A React Query hook to fetch maps by group id
// This hook uses the `getMapsByGroupId` function from the groups `requests` module
export const useMapsByGroupId = (groupId: string): UseQueryResult<Map[]> => {
  return useQuery({
    queryKey: ["mapsByGroupId", groupId],
    queryFn: () => getMapsByGroupId(groupId),
    enabled: Boolean(groupId),
  });
};

export const useCreateGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createGroup,
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ["groups"] });
      if (data?.id) {
        queryClient.setQueryData(["groups", data.id], data);
      }
    },
    onError: (error) => {
      console.error(error);
    },
  });
};

export const useUpdateGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      groupId,
      data,
    }: {
      groupId: string;
      data: GroupUpdateInput;
    }) => updateGroup(groupId, data),
    onSuccess: (data, { groupId }) => {
      queryClient.setQueryData(["groups", groupId], data);
      void queryClient.invalidateQueries({ queryKey: ["groups"] });
      void queryClient.invalidateQueries({
        queryKey: ["mapsByGroupId", groupId],
      });
    },
    onError: (error) => {
      console.error(error);
    },
  });
};

export const useUpdateGroupLayers = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      groupId,
      data,
    }: {
      groupId: string;
      data: GroupLayersUpdateInput;
    }) => updateGroupLayers(groupId, data),
    onSuccess: (_, { groupId }) => {
      void queryClient.invalidateQueries({
        queryKey: ["layersByGroupId", groupId],
      });
      void queryClient.invalidateQueries({ queryKey: ["groups", groupId] });
    },
    onError: (error) => {
      console.error(error);
    },
  });
};

export const useDeleteGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (groupId: string) => deleteGroup(groupId),
    onSuccess: (_, groupId) => {
      void queryClient.invalidateQueries({ queryKey: ["groups"] });
      queryClient.removeQueries({ queryKey: ["groups", groupId] });
      queryClient.removeQueries({ queryKey: ["layersByGroupId", groupId] });
      queryClient.removeQueries({ queryKey: ["mapsByGroupId", groupId] });
    },
    onError: (error) => {
      console.error(error);
    },
  });
};
