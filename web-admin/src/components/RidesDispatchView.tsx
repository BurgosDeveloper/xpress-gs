import React, { useEffect, useState } from "react";
import { PendingRide, LiveDriver, apiListRides, apiListDrivers, apiAssignRideDriver } from "../services/api";
import { socketService } from "../services/socket";
import { audioManager } from "../services/audio";
import {
  Send,
  RefreshCw,
  Search,
  CheckCircle2,
  Clock,
  Car,
  AlertTriangle,
  User,
  X,
} from "lucide-react";

export function RidesDispatchView() {
  const [rides, setRides] = useState<PendingRide[]>([]);
  const [drivers, setDrivers] = useState<LiveDriver[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [selectedRideForAssign, setSelectedRideForAssign] = useState<PendingRide | null>(null);
  const [assigningDriverId, setAssigningDriverId] = useState<string | null>(null);

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [ridesRes, driversRes] = await Promise.all([apiListRides(50), apiListDrivers()]);
      if (ridesRes.ok) setRides(ridesRes.rides || []);
      if (driversRes.ok) setDrivers(driversRes.drivers || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData(false);

    const unsubCreated = socketService.on("ride:created", () => {
      audioManager.playNewRideChime();
      void loadData(true);
    });

    const unsubChanged = socketService.on("ride:changed", () => {
      void loadData(true);
    });

    return () => {
      unsubCreated();
      unsubChanged();
    };
  }, []);

  const handleAssignDriver = async (driverId: string) => {
    if (!selectedRideForAssign) return;
    setAssigningDriverId(driverId);
    try {
      await apiAssignRideDriver(selectedRideForAssign.id, driverId);
      audioManager.playSuccessChime();
      alert(`Servicio #${selectedRideForAssign.id.slice(-6)} asignado exitosamente.`);
      setSelectedRideForAssign(null);
      void loadData(true);
    } catch (e: any) {
      alert(`Error al asignar: ${e.message}`);
    } finally {
      setAssigningDriverId(null);
    }
  };

  const filteredRides = rides.filter((r) => {
    const matchesStatus =
      statusFilter === "ALL"
        ? true
        : statusFilter === "OPEN"
        ? r.status === "OPEN"
        : statusFilter === "ACTIVE"
        ? ["ASSIGNED", "ACCEPTED", "MATCHED", "IN_PROGRESS"].includes(r.status)
        : statusFilter === "COMPLETED"
        ? r.status === "COMPLETED"
        : ["CANCELLED", "EXPIRED"].includes(r.status);

    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      r.id.toLowerCase().includes(q) ||
      r.passenger?.fullName.toLowerCase().includes(q) ||
      r.pickupAddress?.toLowerCase().includes(q) ||
      r.dropoffAddress?.toLowerCase().includes(q) ||
      r.matchedDriver?.fullName.toLowerCase().includes(q);

    return matchesStatus && matchesSearch;
  });

  const availableDrivers = drivers.filter((d) => d.isAvailable && d.user?.isActive);

  return (
    <div className="w-full h-full flex flex-col p-6 bg-[#0A0A08] overflow-hidden">
      {/* Top Header */}
      <div className="shrink-0 flex items-center justify-between mb-6 pb-4 border-b border-white/10">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2.5">
            <Send className="w-6 h-6 text-[#D4AF37]" />
            <span>Consola de Despacho & Servicios</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Gestión en tiempo real de solicitudes, traslados activos y asignaciones directas.
          </p>
        </div>

        <button
          onClick={() => void loadData(false)}
          disabled={loading}
          className="glass-panel px-4 py-2.5 rounded-xl flex items-center gap-2 text-xs font-bold text-white hover:border-[#D4AF37] hover:text-[#F3C966] cursor-pointer transition-all"
        >
          <RefreshCw className={`w-4 h-4 text-[#D4AF37] ${loading ? "animate-spin" : ""}`} />
          <span>Actualizar</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="shrink-0 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: "ALL", label: "Todos los Servicios" },
            { id: "OPEN", label: "Pendientes", alert: rides.some((r) => r.status === "OPEN") },
            { id: "ACTIVE", label: "En Curso / Asignados" },
            { id: "COMPLETED", label: "Finalizados" },
            { id: "CANCELLED", label: "Cancelados" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                statusFilter === tab.id
                  ? "bg-[#D4AF37] text-black shadow-[0_0_15px_rgba(212,175,55,0.6)] font-extrabold"
                  : "glass-panel text-gray-400 hover:text-white"
              }`}
            >
              <span>{tab.label}</span>
              {tab.alert && <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-80 shrink-0">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por cliente, ID o zona..."
            className="w-full bg-[#121008] border border-white/10 rounded-xl py-2 pl-9 pr-4 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#D4AF37]"
          />
        </div>
      </div>

      {/* Rides Grid */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1">
        {filteredRides.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-gray-500 text-xs">
            <Clock className="w-8 h-8 mb-2 text-gray-600" />
            <p className="font-bold">No se encontraron servicios con este filtro.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 pb-4">
          {filteredRides.map((ride) => {
            const isOpen = ride.status === "OPEN";
            const isActive = ["ASSIGNED", "ACCEPTED", "MATCHED", "IN_PROGRESS"].includes(ride.status);
            const isCompleted = ride.status === "COMPLETED";
            const price = Number(ride.agreedPrice || ride.estimatedPrice || 0);

            return (
              <div
                key={ride.id}
                className={`p-4 rounded-2xl glass-panel border transition-all ${
                  isOpen
                    ? "border-amber-500/40 bg-amber-500/[0.02]"
                    : isActive
                    ? "border-[#D4AF37]/50 bg-[#D4AF37]/[0.02]"
                    : "border-white/5"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-extrabold text-[#F3C966] bg-black/40 px-2 py-1 rounded-lg border border-[#D4AF37]/30">
                      #{ride.id.slice(-6)}
                    </span>
                    <span
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                        isOpen
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse"
                          : isActive
                          ? "bg-[#D4AF37]/20 text-[#F3C966] border border-[#D4AF37]"
                          : isCompleted
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                          : "bg-red-500/20 text-red-300 border border-red-500/40"
                      }`}
                    >
                      {ride.status === "OPEN"
                        ? "Esperando Asignación"
                        : ride.status === "IN_PROGRESS"
                        ? "En Viaje (Taxímetro Activo)"
                        : ride.status === "ASSIGNED" || ride.status === "MATCHED" || ride.status === "ACCEPTED"
                        ? "Conductor Asignado (En Camino)"
                        : ride.status === "COMPLETED"
                        ? "Finalizado Exitoso"
                        : "Cancelado"}
                    </span>
                    <span className="text-xs text-gray-400 font-medium">
                      Modo: <span className="text-white font-bold">{ride.serviceTypeWanted}</span>
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-base font-extrabold text-emerald-400">
                      ${price.toLocaleString("es-CO")} COP
                    </span>
                    <span className="block text-[10px] text-gray-500">
                      {new Date(ride.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>

                {/* Route & People */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-300 py-2 border-y border-white/5">
                  <div className="space-y-1.5">
                    <p className="flex items-start gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#D4AF37] mt-0.5 shrink-0" />
                      <span className="text-gray-400">Origen: <strong className="text-white">{ride.pickupAddress || "Coordenadas fijadas"}</strong></span>
                    </p>
                    <p className="flex items-start gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-400 mt-0.5 shrink-0" />
                      <span className="text-gray-400">Destino: <strong className="text-white">{ride.dropoffAddress || "Coordenadas fijadas"}</strong></span>
                    </p>
                  </div>

                  <div className="space-y-1.5 flex flex-col justify-center">
                    <p className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-[#D4AF37]" />
                      <span>Cliente: <strong className="text-white">{ride.passenger?.fullName || "Anónimo"}</strong></span>
                      {ride.passenger?.phone && (
                        <span className="text-gray-400">({ride.passenger.phone})</span>
                      )}
                    </p>

                    <p className="flex items-center gap-2">
                      <Car className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Conductor: <strong className="text-white">{ride.matchedDriver?.fullName || "Sin asignar"}</strong></span>
                      {ride.matchedDriver?.phone && (
                        <span className="text-gray-400">({ride.matchedDriver.phone})</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Action button if OPEN */}
                {isOpen && (
                  <div className="mt-3 flex items-center justify-end">
                    <button
                      onClick={() => setSelectedRideForAssign(ride)}
                      className="px-4 py-2 glow-btn text-white rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Asignar Conductor de la Flota</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          </div>
        )}
      </div>

      {/* Modal Seleccionar Conductor para la Carrera */}
      {selectedRideForAssign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="glass-panel-neon rounded-2xl w-full max-w-lg p-6 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
              <div>
                <h3 className="font-extrabold text-base text-white">
                  Asignar a Carrera #{selectedRideForAssign.id.slice(-6)}
                </h3>
                <p className="text-xs text-gray-400">
                  Selecciona un conductor disponible para asignarle este traslado.
                </p>
              </div>
              <button
                onClick={() => setSelectedRideForAssign(null)}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-2.5 pr-1">
              {availableDrivers.length === 0 ? (
                <div className="text-center py-8 text-xs text-gray-400">
                  <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                  <p className="font-bold">No hay conductores en línea disponibles.</p>
                </div>
              ) : (
                availableDrivers.map((d) => (
                  <div
                    key={d.id}
                    className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between hover:border-[#D4AF37] transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0" />
                      <div>
                        <p className="font-bold text-white text-xs">{d.fullName}</p>
                        <p className="text-[11px] text-gray-400">
                          {d.serviceType} • {d.vehicle?.brand} {d.vehicle?.model} • Placa: {d.vehicle?.plate || "S/P"}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleAssignDriver(d.id)}
                      disabled={assigningDriverId === d.id}
                      className="px-3.5 py-1.5 rounded-lg bg-[#D4AF37] hover:bg-[#F3C966] text-black font-extrabold text-xs cursor-pointer disabled:opacity-50 transition-all shadow-[0_0_10px_rgba(212,175,55,0.4)]"
                    >
                      {assigningDriverId === d.id ? "Asignando..." : "Asignar"}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
