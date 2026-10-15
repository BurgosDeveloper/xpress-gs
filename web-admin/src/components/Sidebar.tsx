import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { socketService } from "../services/socket";
import { audioManager } from "../services/audio";
import {
  Map,
  Send,
  Users,
  Car,
  Settings,
  LogOut,
  Volume2,
  VolumeX,
  WifiOff,
} from "lucide-react";

export type NavTab = "map" | "dispatch" | "drivers" | "passengers" | "settings";

interface SidebarProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  pendingRidesCount?: number;
}

export function Sidebar({ currentTab, onTabChange, pendingRidesCount = 0 }: SidebarProps) {
  const { user, logout } = useAuth();
  const [connected, setConnected] = useState(socketService.isConnected());
  const [soundEnabled, setSoundEnabled] = useState(audioManager.isSoundEnabled());

  useEffect(() => {
    const unsub = socketService.on("connection_status", (data: any) => {
      setConnected(Boolean(data.connected));
    });
    return () => unsub();
  }, []);

  const toggleSound = () => {
    const next = !soundEnabled;
    audioManager.setSoundEnabled(next);
    setSoundEnabled(next);
  };

  const navItems: { id: NavTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      id: "map",
      label: "Flota en Vivo",
      icon: <Map className="w-4 h-4" />,
    },
    {
      id: "dispatch",
      label: "Despacho & Carreras",
      icon: <Send className="w-4 h-4" />,
      badge: pendingRidesCount > 0 ? pendingRidesCount : undefined,
    },
    {
      id: "drivers",
      label: "Conductores",
      icon: <Car className="w-4 h-4" />,
    },
    {
      id: "passengers",
      label: "Clientes / Pasajeros",
      icon: <Users className="w-4 h-4" />,
    },
    {
      id: "settings",
      label: "Tarifas & Configuración",
      icon: <Settings className="w-4 h-4" />,
    },
  ];

  return (
    <aside className="w-[270px] h-full shrink-0 bg-[#0E0C07] border-r border-white/10 flex flex-col justify-between p-4.5 z-30 select-none shadow-2xl">
      {/* Brand Header */}
      <div>
        <div className="flex items-center gap-3 px-2 py-3 mb-6 border-b border-white/10">
          <img
            src="/logo_xpress.png"
            alt="Xpress"
            className="h-10 w-auto object-contain filter drop-shadow-[0_0_12px_rgba(212,175,55,0.6)]"
          />
          <div className="overflow-hidden">
            <h2 className="font-black text-sm tracking-wider text-white">XPRESS TRASLADOS</h2>
            <p className="text-[10px] text-[#D4AF37] font-bold tracking-widest uppercase truncate">
              Oficina Principal
            </p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-2">
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? "bg-gradient-to-r from-[#D4AF37] to-[#B8860B] text-black font-black shadow-[0_4px_18px_rgba(212,175,55,0.4)]"
                    : "text-gray-300 hover:text-white hover:bg-white/[0.05]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={isActive ? "text-black" : "text-[#D4AF37]"}>{item.icon}</span>
                  <span>{item.label}</span>
                </div>

                {item.badge != null && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                      isActive ? "bg-black text-[#D4AF37]" : "bg-[#D4AF37] text-black"
                    } animate-bounce`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Controls & User Card */}
      <div className="space-y-3 pt-4 border-t border-white/10">
        {/* Real-time Status & Audio Controls */}
        <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-black/50 border border-white/5 text-[11px]">
          <div className="flex items-center gap-2">
            {connected ? (
              <>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                <span className="font-bold text-emerald-400">Sockets En Vivo</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-red-400" />
                <span className="font-bold text-red-400">Desconectado</span>
              </>
            )}
          </div>

          <button
            onClick={toggleSound}
            title={soundEnabled ? "Silenciar alertas" : "Activar sonido de alertas"}
            className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-all cursor-pointer"
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-[#D4AF37]" />
            ) : (
              <VolumeX className="w-4 h-4 text-gray-500" />
            )}
          </button>
        </div>

        {/* User Card */}
        <div className="p-3 rounded-2xl bg-[#141108] border border-white/10 flex items-center justify-between">
          <div className="overflow-hidden pr-2">
            <p className="text-xs font-bold text-white truncate">{user?.email || "Administrador"}</p>
            <p className="text-[10px] text-gray-400">Rol: Administrador</p>
          </div>

          <button
            onClick={logout}
            title="Cerrar Sesión"
            className="p-2 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/30 transition-all cursor-pointer shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
