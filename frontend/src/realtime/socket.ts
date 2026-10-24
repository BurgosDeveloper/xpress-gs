import { AppState } from "react-native";
import { io, type Socket } from "socket.io-client";
import { getServerOrigin } from "../lib/apiBase";

type RealtimeHandler = (payload: any) => void;

let socket: Socket | null = null;
let currentToken: string | null = null;
let appStateListenerInstalled = false;

const listeners = new Map<string, Set<RealtimeHandler>>();

function bindListeners(target: Socket) {
  for (const [event, handlers] of listeners.entries()) {
    for (const handler of handlers) {
      target.on(event, handler);
    }
  }
}

function unbindListeners(target: Socket) {
  for (const [event, handlers] of listeners.entries()) {
    for (const handler of handlers) {
      target.off(event, handler);
    }
  }
}

function disconnectSocket() {
  if (!socket) return;
  unbindListeners(socket);
  socket.disconnect();
  socket = null;
}

export function dispatchLocalRealtimeEvent(event: string, payload: any) {
  const set = listeners.get(event);
  if (!set || set.size === 0) return;
  for (const handler of Array.from(set)) {
    try {
      handler(payload);
    } catch {
      // ignore handler errors
    }
  }
}

export function bridgeNotificationDataToRealtime(rawData: any) {
  if (!rawData || typeof rawData !== "object") return;
  const type = rawData.type != null ? String(rawData.type).trim() : "";
  const rideId = rawData.rideId != null ? String(rawData.rideId).trim() : "";
  const offerId = rawData.offerId != null ? String(rawData.offerId).trim() : "";
  const driverId = rawData.driverId != null ? String(rawData.driverId).trim() : "";
  const eventId = rawData.eventId != null ? String(rawData.eventId).trim() : undefined;

  if (type === "RIDE_AVAILABLE" || type === "OFFER_AVAILABLE" || type === "OFFER_UNAVAILABLE" || type === "RIDE_SELECTION_CHANGED" || type === "RIDE_CANCELLED") {
    dispatchLocalRealtimeEvent("driver:nearby:changed", { type, rideId, offerId, eventId });
  }

  if (type === "RIDE_OFFERED") {
    dispatchLocalRealtimeEvent("ride:offers:changed", { rideId, driverId, type, eventId });
    dispatchLocalRealtimeEvent("ride:changed", { rideId, driverId, type, eventId });
  }

  if (
    type === "RIDE_ACCEPTED" ||
    type === "RIDE_MATCHED" ||
    type === "RIDE_ASSIGNED" ||
    type === "DRIVER_ARRIVED" ||
    type === "OFFER_COMMITTED" ||
    type === "RIDE_COMPLETED" ||
    type === "RIDE_CANCELLED" ||
    type === "RIDE_NOT_SELECTED" ||
    type === "RIDE_OFFER_REJECTED"
  ) {
    dispatchLocalRealtimeEvent("ride:changed", { rideId, offerId, driverId, type, eventId });
    if (type === "RIDE_ACCEPTED" || type === "RIDE_MATCHED") {
      dispatchLocalRealtimeEvent("ride:matched", { rideId, driverId, type, eventId });
    }
  }
}

export function ensureRealtimeConnected() {
  if (socket && !socket.connected && currentToken) {
    try {
      socket.connect();
    } catch {
      // ignore
    }
  }
}

function ensureAppStateListener() {
  if (appStateListenerInstalled) return;
  appStateListenerInstalled = true;
  AppState.addEventListener("change", (nextState) => {
    if (nextState === "active") {
      ensureRealtimeConnected();
    }
  });
}

export function syncRealtimeToken(token: string | null | undefined) {
  ensureAppStateListener();

  const normalized = typeof token === "string" ? token.trim() : "";
  if (!normalized) {
    currentToken = null;
    disconnectSocket();
    return;
  }

  if (socket && currentToken === normalized) {
    ensureRealtimeConnected();
    return;
  }

  currentToken = normalized;
  disconnectSocket();

  let hasConnectedOnce = false;

  const next = io(getServerOrigin(), {
    auth: { token: normalized },
    withCredentials: true,
    timeout: 10000,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  bindListeners(next);
  next.on("connect", () => {
    if (hasConnectedOnce) {
      dispatchLocalRealtimeEvent("ride:changed", { type: "SOCKET_RECONNECTED" });
      dispatchLocalRealtimeEvent("ride:offers:changed", { type: "SOCKET_RECONNECTED" });
      dispatchLocalRealtimeEvent("driver:nearby:changed", { type: "SOCKET_RECONNECTED" });
    }
    hasConnectedOnce = true;
  });
  next.on("connect_error", () => {
    // best-effort
  });

  socket = next;
}

export function subscribeRealtimeEvent(event: string, handler: RealtimeHandler) {
  const normalizedEvent = event.trim();
  if (!normalizedEvent) return () => {};

  const set = listeners.get(normalizedEvent) ?? new Set<RealtimeHandler>();
  set.add(handler);
  listeners.set(normalizedEvent, set);

  socket?.on(normalizedEvent, handler);

  return () => {
    socket?.off(normalizedEvent, handler);
    const current = listeners.get(normalizedEvent);
    if (!current) return;
    current.delete(handler);
    if (current.size === 0) listeners.delete(normalizedEvent);
  };
}

export function emitRealtimeEvent(event: string, payload: any) {
  if (socket) {
    socket.emit(event, payload);
  }
}
