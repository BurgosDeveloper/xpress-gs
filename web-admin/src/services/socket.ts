import { io, Socket } from "socket.io-client";
import { SOCKET_URL } from "./api";

class SocketService {
  private socket: Socket | null = null;
  private connected = false;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();

  public connect(token: string) {
    if (this.socket && this.connected) return;

    if (this.socket) {
      this.socket.disconnect();
    }

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    this.socket.on("connect", () => {
      this.connected = true;
      this.notifyListeners("connection_status", { connected: true });
    });

    this.socket.on("disconnect", () => {
      this.connected = false;
      this.notifyListeners("connection_status", { connected: false });
    });

    // Escuchar eventos globales del servidor y despacharlos a los suscriptores
    const forwardEvents = [
      "driver_location_update",
      "driver_availability_update",
      "ride:created",
      "rides:available",
      "ride:changed",
      "offer:received",
    ];

    for (const evt of forwardEvents) {
      this.socket.on(evt, (data: any) => {
        this.notifyListeners(evt, data);
      });
    }
  }

  public disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.connected = false;
  }

  public isConnected(): boolean {
    return this.connected;
  }

  public on(event: string, callback: (data: any) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    return () => {
      this.off(event, callback);
    };
  }

  public off(event: string, callback: (data: any) => void) {
    const set = this.listeners.get(event);
    if (set) {
      set.delete(callback);
    }
  }

  private notifyListeners(event: string, data: any) {
    const set = this.listeners.get(event);
    if (set) {
      set.forEach((cb) => {
        try {
          cb(data);
        } catch (e) {
          console.error(`Error in listener for ${event}:`, e);
        }
      });
    }
  }
}

export const socketService = new SocketService();
