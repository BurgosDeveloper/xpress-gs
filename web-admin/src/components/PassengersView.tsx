import React, { useEffect, useState } from "react";
import { apiListPassengers, apiSetPassengerActive } from "../services/api";
import { Users, Search, RefreshCw, Phone, ShieldCheck, ShieldAlert } from "lucide-react";

export function PassengersView() {
  const [passengers, setPassengers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const loadPassengers = async () => {
    setLoading(true);
    try {
      const res = await apiListPassengers(100);
      if (res.ok) setPassengers(res.passengers || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPassengers();
  }, []);

  const handleToggleActive = async (passenger: any) => {
    const nextState = !passenger.user?.isActive;
    try {
      await apiSetPassengerActive(passenger.id, nextState);
      setPassengers((prev) =>
        prev.map((p) => (p.id === passenger.id ? { ...p, user: { ...p.user, isActive: nextState } } : p))
      );
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    }
  };

  const filtered = passengers.filter((p) => {
    const q = search.toLowerCase();
    return (
      !q ||
      p.fullName?.toLowerCase().includes(q) ||
      p.phone?.toLowerCase().includes(q) ||
      p.user?.email?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="w-full h-full flex flex-col p-6 bg-[#050811] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2.5">
            <Users className="w-6 h-6 text-[#00E5FF]" />
            <span>Directorio de Clientes / Pasajeros</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Visualización y control de usuarios registrados en la plataforma ({passengers.length} clientes).
          </p>
        </div>

        <button
          onClick={loadPassengers}
          disabled={loading}
          className="glass-panel px-4 py-2.5 rounded-xl flex items-center gap-2 text-xs font-bold text-white hover:border-[#0000FF] cursor-pointer transition-all"
        >
          <RefreshCw className={`w-4 h-4 text-[#00E5FF] ${loading ? "animate-spin" : ""}`} />
          <span>Actualizar</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="mb-6 flex justify-between items-center">
        <div className="relative w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, correo, teléfono..."
            className="w-full bg-[#0A0D18] border border-white/10 rounded-xl py-2 pl-9 pr-4 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#0000FF]"
          />
        </div>
      </div>

      {/* Passengers Table */}
      <div className="flex-1 overflow-y-auto rounded-2xl glass-panel border border-white/10">
        <table className="w-full text-left text-xs text-gray-300">
          <thead className="text-[11px] uppercase tracking-wider text-gray-400 bg-white/[0.03] border-b border-white/10 sticky top-0 backdrop-blur-md">
            <tr>
              <th className="py-3.5 px-4 font-bold">Cliente</th>
              <th className="py-3.5 px-4 font-bold">Teléfono</th>
              <th className="py-3.5 px-4 font-bold">Viajes Realizados</th>
              <th className="py-3.5 px-4 font-bold">Fecha de Registro</th>
              <th className="py-3.5 px-4 font-bold">Estado de Cuenta</th>
              <th className="py-3.5 px-4 font-bold text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.map((passenger) => {
              const isActive = passenger.user?.isActive ?? true;

              return (
                <tr key={passenger.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      {passenger.photoUrl ? (
                        <img
                          src={passenger.photoUrl}
                          alt={passenger.fullName}
                          className="w-9 h-9 rounded-xl object-cover border border-white/10"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-xl bg-[#0A1026] border border-white/10 flex items-center justify-center font-bold text-xs text-[#00E5FF]">
                          {(passenger.fullName || "U").slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <span className="font-bold text-white text-xs block">{passenger.fullName || "Sin nombre"}</span>
                        <span className="text-[11px] text-gray-400">{passenger.user?.email}</span>
                      </div>
                    </div>
                  </td>

                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-gray-400" />
                      <span>{passenger.phone || "No especificado"}</span>
                    </div>
                  </td>

                  <td className="py-3 px-4">
                    <span className="font-bold text-white">{passenger._count?.rides ?? 0} viajes</span>
                  </td>

                  <td className="py-3 px-4 text-gray-400">
                    {new Date(passenger.createdAt).toLocaleDateString("es-VE", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>

                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                        isActive
                          ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                          : "bg-red-500/15 text-red-300 border border-red-500/30"
                      }`}
                    >
                      {isActive ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
                      <span>{isActive ? "Activo" : "Bloqueado"}</span>
                    </span>
                  </td>

                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => handleToggleActive(passenger)}
                      className={`px-3 py-1 rounded-lg font-bold text-[11px] cursor-pointer transition-all ${
                        isActive
                          ? "bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/30"
                          : "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30"
                      }`}
                    >
                      {isActive ? "Bloquear" : "Desbloquear"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
