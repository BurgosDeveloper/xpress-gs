import { useEffect, useState } from "react";
import { subscribeRealtimeEvent } from "../realtime/socket";

type Listener = (counts: Record<string, number>) => void;

let unreadCounts: Record<string, number> = {};
let activeChatRideId: string | null = null;
const listeners = new Set<Listener>();

export function setActiveChatRideId(rideId: string | null) {
  activeChatRideId = rideId;
  if (rideId && unreadCounts[rideId]) {
    unreadCounts[rideId] = 0;
    notifyListeners();
  }
}

export function getUnreadCountForRide(rideId?: string | null): number {
  if (!rideId) return 0;
  return unreadCounts[rideId] || 0;
}

export function clearUnreadCountForRide(rideId: string) {
  if (unreadCounts[rideId]) {
    unreadCounts[rideId] = 0;
    notifyListeners();
  }
}

export function subscribeUnreadCounts(listener: Listener) {
  listeners.add(listener);
  listener({ ...unreadCounts });
  return () => {
    listeners.delete(listener);
  };
}

function notifyListeners() {
  const current = { ...unreadCounts };
  for (const listener of listeners) {
    listener(current);
  }
}

// Suscripción global a eventos en tiempo real de socket
if (typeof window !== "undefined" || globalThis) {
  subscribeRealtimeEvent("chat:message", (msg: any) => {
    if (msg && msg.rideId) {
      // Si el usuario está activo en la pantalla de chat de este viaje, no incrementar no leídos
      if (activeChatRideId === msg.rideId) return;

      unreadCounts[msg.rideId] = (unreadCounts[msg.rideId] || 0) + 1;
      notifyListeners();
    }
  });
}

export function useUnreadChatCount(rideId?: string | null): number {
  const [count, setCount] = useState<number>(rideId ? getUnreadCountForRide(rideId) : 0);

  useEffect(() => {
    if (!rideId) {
      setCount(0);
      return;
    }
    setCount(getUnreadCountForRide(rideId));
    return subscribeUnreadCounts((counts) => {
      setCount(counts[rideId] || 0);
    });
  }, [rideId]);

  return count;
}
