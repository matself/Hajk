// Only use this if you're not authenticated (e.g. in development mode) AND
// you are using WebSockets.
//
// This is used to identify the admin client in the WebSocket presence system.
//
// If you are authenticated, you should use the user's ID instead.
//
// If you are not using WebSockets, you should not use this.
//
// If you are using WebSockets and you are authenticated, you should use the user's ID instead.
const STORAGE_KEY = "hajk-admin-client-id";

function randomId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/** Stable id for this browser (no Hajk session user when auth is off). */
export function getAdminClientId(): string {
  try {
    let id = sessionStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = randomId();
      sessionStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  } catch {
    return randomId();
  }
}
