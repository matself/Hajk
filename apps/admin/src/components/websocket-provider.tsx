import { useEffect, useRef } from "react";
import { useLocation } from "react-router";
import { toast } from "react-toastify";
import useWebSocketStore from "../store/use-websocket-store";
import useAdminPresenceStore, {
  AdminPresence,
} from "../store/use-admin-presence-store";
import useAppStateStore from "../store/use-app-state-store";
import { getAdminClientId } from "../lib/admin-client-id";

interface WebSocketProviderProps {
  children: React.ReactNode;
}

// Message types from backend
interface PresenceMessage {
  type: "presence-update" | "presence-join" | "presence-leave";
  payload: AdminPresence | { id: string };
}

interface AdminSyncMessage {
  type: "admin-sync";
  payload: {
    admins: AdminPresence[];
  };
}

type WSMessage = PresenceMessage | AdminSyncMessage;

// Parse route to determine what resource is being edited
function parseRoute(pathname: string): {
  resourceType: AdminPresence["resourceType"];
  resourceId: string;
} | null {
  const patterns: {
    regex: RegExp;
    type: AdminPresence["resourceType"];
  }[] = [
    { regex: /^\/maps\/(.+)$/, type: "map" },
    {
      regex: /^\/(search-layers|editing-layers|display-layers)\/(.+)$/,
      type: "layer",
    },
    { regex: /^\/tools\/(.+)$/, type: "tool" },
    { regex: /^\/groups\/(.+)$/, type: "group" },
    { regex: /^\/services\/(.+)$/, type: "service" },
  ];

  for (const { regex, type } of patterns) {
    const match = pathname.match(regex);
    if (match) {
      const id = type === "layer" ? match[2] : match[1];
      return { resourceType: type, resourceId: id };
    }
  }

  return null;
}

const PRESENCE_LABEL = "Admin";

/**
 * WebSocket provider for multi-admin awareness.
 *
 * Not mounted in root layout by default — wrap the layout with
 * `<WebSocketProvider>` when you want presence again. Requires backend
 * `ENABLE_WEBSOCKETS=true` and an admin session or compatible auth setup.
 */
export function WebSocketProvider({ children }: WebSocketProviderProps) {
  const location = useLocation();
  const clientId = getAdminClientId();
  const apiBaseUrl = useAppStateStore((state) => state.apiBaseUrl);
  const isConnected = useWebSocketStore((state) => state.isConnected);
  const lastMessage = useWebSocketStore((state) => state.lastMessage);

  const lastBroadcastedResource = useRef<string | null>(null);
  const prevAdminsRef = useRef<AdminPresence[]>([]);
  const isRegistered = useRef(false);
  const connectedUserId = useRef<string | null>(null);

  useEffect(() => {
    if (!clientId || !apiBaseUrl) {
      return;
    }

    if (
      connectedUserId.current === clientId &&
      useWebSocketStore.getState().isConnected
    ) {
      return;
    }

    const url = new URL(apiBaseUrl);
    const wsProtocol = url.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${wsProtocol}//${url.host}/api/v3/websockets`;

    connectedUserId.current = clientId;
    useWebSocketStore.getState().connect(wsUrl);
    isRegistered.current = false;

    return () => {
      useWebSocketStore.getState().disconnect();
      connectedUserId.current = null;
      isRegistered.current = false;
    };
  }, [clientId, apiBaseUrl]);

  useEffect(() => {
    if (!isConnected || isRegistered.current) {
      return;
    }

    useWebSocketStore.getState().sendMessage({
      type: "register",
      payload: {
        userId: clientId,
        userName: PRESENCE_LABEL,
      },
    });
    isRegistered.current = true;
  }, [isConnected, clientId]);

  useEffect(() => {
    if (!isConnected) {
      return;
    }

    const resource = parseRoute(location.pathname);
    const resourceKey = resource
      ? `${resource.resourceType}:${resource.resourceId}`
      : null;

    if (resourceKey === lastBroadcastedResource.current) {
      return;
    }

    lastBroadcastedResource.current = resourceKey;
    const wsStore = useWebSocketStore.getState();
    const presenceStore = useAdminPresenceStore.getState();

    if (resource) {
      const presence: AdminPresence = {
        id: `${clientId}-${Date.now()}`,
        userId: clientId,
        userName: PRESENCE_LABEL,
        resource: resourceKey!,
        resourceType: resource.resourceType,
        resourceId: resource.resourceId,
        timestamp: Date.now(),
      };

      presenceStore.setMyPresence(presence);

      wsStore.sendMessage({
        type: "presence-update",
        payload: {
          resourceType: resource.resourceType,
          resourceId: resource.resourceId,
        },
      });
    } else {
      wsStore.sendMessage({
        type: "presence-leave",
        payload: {},
      });
      presenceStore.setMyPresence(null);
    }
  }, [location.pathname, isConnected, clientId]);

  useEffect(() => {
    if (!lastMessage) return;

    const msg = lastMessage as unknown as WSMessage;
    const store = useAdminPresenceStore.getState();

    switch (msg.type) {
      case "admin-sync":
        if ("admins" in msg.payload) {
          store.setActiveAdmins(msg.payload.admins);
        }
        break;

      case "presence-join":
      case "presence-update":
        if ("userId" in msg.payload) {
          store.addAdmin(msg.payload);
        }
        break;

      case "presence-leave":
        if ("id" in msg.payload) {
          store.removeAdmin(msg.payload.id);
        }
        break;
    }
  }, [lastMessage]);

  useEffect(() => {
    const resource = parseRoute(location.pathname);
    if (!resource) {
      prevAdminsRef.current = [];
      return;
    }

    const currentAdmins = useAdminPresenceStore
      .getState()
      .getAdminsOnResource(resource.resourceType, resource.resourceId);
    const prevAdmins = prevAdminsRef.current;

    const newAdmins = currentAdmins.filter(
      (a) => !prevAdmins.find((p) => p.userId === a.userId),
    );

    const leftAdmins = prevAdmins.filter(
      (p) => !currentAdmins.find((a) => a.userId === p.userId),
    );

    newAdmins.forEach((admin) => {
      toast.info(
        `${admin.userName} started editing this ${resource.resourceType}`,
        { position: "bottom-right", autoClose: 5000 },
      );
    });

    leftAdmins.forEach((admin) => {
      toast.info(
        `${admin.userName} stopped editing this ${resource.resourceType}`,
        { position: "bottom-right", autoClose: 3000 },
      );
    });

    prevAdminsRef.current = currentAdmins;
  }, [location.pathname, lastMessage]);

  useEffect(() => {
    const interval = setInterval(() => {
      useAdminPresenceStore.getState().clearStalePresence();
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  return <>{children}</>;
}

export default WebSocketProvider;
