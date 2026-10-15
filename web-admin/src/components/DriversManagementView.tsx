import React, { useEffect, useState } from "react";
import {
  LiveDriver,
  apiListDrivers,
  apiSetDriverActive,
  apiUpdateDriverStatus,
  apiAdjustDriverCredits,
} from "../services/api";
import {
  Car,
  Search,
  RefreshCw,
  Star,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  PlusCircle,
  Phone,
  X,
  ShieldAlert,
} from "lucide-react";

export function DriversManagementView() {
  const [drivers, setDrivers] = useState<LiveDriver[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedDriverForCredits, setSelectedDriverForCredits] = useState<LiveDriver | null>(null);
  const [creditAmount, setCreditAmount] = useState("20000");
  const [creditNote, setCreditNote] = useState("Recarga administrativa de oficina");
  const [creditSubmitting, setCreditSubmitting] = useState(false);

  const loadDrivers = async () => {
    setLoading(true);
    try {
      const res = await apiListDrivers();
      if (res.ok) setDrivers(res.drivers || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDrivers();
  }, []);

  const handleToggleActive = async (driver: LiveDriver) => {
    const nextState = !driver.user?.isActive;
    try {
      await apiSetDriverActive(driver.id, nextState);
      setDrivers((prev) =>
        prev.map((d) => (d.id === driver.id ? { ...d, user: { ...d.user!, isActive: nextState } } : d))
      );
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    }
  };

  const handleStatusChange = async (driverId: string, status: "APPROVED" | "OBSERVATION" | "REJECTED") => {
    try {
      await apiUpdateDriverStatus(driverId, status);
      setDrivers((prev) => prev.map((d) => (d.id === driverId ? { ...d, status } : d)));
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    }
  };

  const handleRechargeCredits = async () => {
    if (!selectedDriverForCredits) return;
    const amount = parseInt(creditAmount, 10);
    if (isNaN(amount) || amount === 0) {
      alert("Monto inválido");
      return;
    }

    setCreditSubmitting(true);
    try {
      await apiAdjustDriverCredits(selectedDriverForCredits.id, amount, creditNote);
      alert(`Créditos actualizados exitosamente (${amount > 0 ? "+" : ""}${amount} COP).`);
      setSelectedDriverForCredits(null);
      void loadDrivers();
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    } finally {
      setCreditSubmitting(false);
    }
  };

  const filtered = drivers.filter((d) => {
    const q = search.toLowerCase();
    return (
      !q ||
      d.fullName.toLowerCase().includes(q) ||
      d.phone.toLowerCase().includes(q) ||
      d.user?.email.toLowerCase().includes(q) ||
      d.vehicle?.plate?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="w-full h-full flex flex-col p-6 bg-[#0A0A08] overflow-hidden">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between mb-6 pb-4 border-b border-white/10">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2.5">
            <Car className="w-6 h-6 text-[#D4AF37]" />
            <span>Gestión de Flota & Conductores</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Control de cuentas, créditos, estados de verificación y telemetría de ejecutivos ({drivers.length} registrados).
          </p>
        </div>

        <button
          onClick={loadDrivers}
          disabled={loading}
          className="glass-panel px-4 py-2.5 rounded-xl flex items-center gap-2 text-xs font-bold text-white hover:border-[#D4AF37] hover:text-[#F3C966] cursor-pointer transition-all"
        >
          <RefreshCw className={`w-4 h-4 text-[#D4AF37] ${loading ? "animate-spin" : ""}`} />
          <span>Actualizar</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="shrink-0 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, teléfono, placa..."
            className="w-full bg-[#121008] border border-white/10 rounded-xl py-2 pl-9 pr-4 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#D4AF37]"
          />
        </div>

        <div className="flex items-center gap-3 text-xs text-gray-400 shrink-0">
          <span>{drivers.filter((d) => d.isAvailable).length} En Línea</span>
          <span>•</span>
          <span>{drivers.filter((d) => d.status === "APPROVED").length} Aprobados</span>
        </div>
      </div>

      {/* Drivers Table Card */}
      <div className="flex-1 min-h-0 rounded-2xl glass-panel border border-white/10 flex flex-col overflow-hidden">
        <div className="overflow-auto flex-1">
          <table className="w-full text-left text-xs text-gray-300">
            <thead className="text-[11px] uppercase tracking-wider text-[#F3C966] bg-[#18150B] border-b border-white/10 sticky top-0 z-10 shadow-md">
              <tr>
              <th className="py-3.5 px-4 font-bold">Conductor</th>
              <th className="py-3.5 px-4 font-bold">Vehículo & Placa</th>
              <th className="py-3.5 px-4 font-bold">Contacto</th>
              <th className="py-3.5 px-4 font-bold">Rendimiento</th>
              <th className="py-3.5 px-4 font-bold">Créditos</th>
              <th className="py-3.5 px-4 font-bold">Estado Verificación</th>
              <th className="py-3.5 px-4 font-bold text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.map((driver) => {
              const isOnline = driver.isAvailable;
              const isActiveUser = driver.user?.isActive ?? true;
              const balance = driver.user?.creditAccount?.balanceCop ?? 0;

              return (
                <tr key={driver.id} className="hover:bg-white/[0.02] transition-colors">
                  {/* Conductor */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      {driver.photoUrl ? (
                        <img
                          src={driver.photoUrl}
                          alt={driver.fullName}
                          className="w-9 h-9 rounded-xl object-cover border border-[#D4AF37]"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-xl bg-[#141108] border border-[#D4AF37]/50 flex items-center justify-center font-bold text-xs text-[#F3C966]">
                          {driver.fullName.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-white text-xs">{driver.fullName}</span>
                          <span
                            className={`w-2 h-2 rounded-full ${isOnline ? "bg-emerald-400" : "bg-gray-500"}`}
                            title={isOnline ? "En Línea" : "Desconectado"}
                          />
                        </div>
                        <span className="text-[11px] text-gray-400">{driver.user?.email}</span>
                      </div>
                    </div>
                  </td>

                  {/* Vehículo */}
                  <td className="py-3 px-4">
                    <p className="font-semibold text-white text-xs">
                      {driver.vehicle ? `${driver.vehicle.brand} ${driver.vehicle.model}` : "Sin registrar"}
                    </p>
                    <span className="font-mono text-[10px] text-[#F3C966] bg-black/40 px-1.5 py-0.5 rounded border border-[#D4AF37]/30">
                      {driver.vehicle?.plate || "S/P"}
                    </span>
                  </td>

                  {/* Contacto */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-gray-300">{driver.phone}</span>
                    </div>
                  </td>

                  {/* Rendimiento */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1 text-[#D4AF37] font-bold mb-0.5">
                      <Star className="w-3.5 h-3.5 fill-[#D4AF37] text-[#D4AF37]" />
                      <span>{Number(driver.avgRating ?? 5.0).toFixed(1)}</span>
                      <span className="text-gray-500 font-normal">({driver.ratingsCount ?? 0})</span>
                    </div>
                    <span className="text-[11px] text-gray-400">{driver.completedRidesCount ?? 0} carreras</span>
                  </td>

                  {/* Créditos */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className={`font-mono font-bold ${balance <= 0 ? "text-red-400" : "text-emerald-400"}`}>
                        ${balance.toLocaleString("es-CO")} COP
                      </span>
                      <button
                        onClick={() => setSelectedDriverForCredits(driver)}
                        title="Recargar Créditos"
                        className="p-1 rounded-lg bg-[#D4AF37]/20 text-[#D4AF37] hover:bg-[#D4AF37]/40 cursor-pointer transition-all"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="py-3 px-4">
                    <select
                      value={driver.status}
                      onChange={(e) => handleStatusChange(driver.id, e.target.value as any)}
                      className={`bg-black/50 border rounded-lg px-2 py-1 text-[11px] font-bold cursor-pointer focus:outline-none ${
                        driver.status === "APPROVED"
                          ? "text-emerald-400 border-emerald-500/40"
                          : driver.status === "OBSERVATION"
                          ? "text-amber-400 border-amber-500/40"
                          : "text-red-400 border-red-500/40"
                      }`}
                    >
                      <option value="APPROVED">APROBADO</option>
                      <option value="OBSERVATION">OBSERVACIÓN</option>
                      <option value="REJECTED">RECHAZADO</option>
                    </select>
                  </td>

                  {/* Acciones */}
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => handleToggleActive(driver)}
                      className={`px-3 py-1 rounded-lg font-bold text-[11px] cursor-pointer transition-all ${
                        isActiveUser
                          ? "bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/30"
                          : "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30"
                      }`}
                    >
                      {isActiveUser ? "Bloquear" : "Habilitar"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>

      {/* Modal Recarga de Créditos */}
      {selectedDriverForCredits && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="glass-panel-neon rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2.5">
                <CreditCard className="w-5 h-5 text-[#D4AF37]" />
                <h3 className="font-extrabold text-base text-white">Recarga de Créditos</h3>
              </div>
              <button
                onClick={() => setSelectedDriverForCredits(null)}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-gray-300 mb-4">
              Conductor: <strong className="text-white">{selectedDriverForCredits.fullName}</strong>
              <br />
              Saldo actual:{" "}
              <strong className="text-emerald-400 font-mono">
                ${(selectedDriverForCredits.user?.creditAccount?.balanceCop ?? 0).toLocaleString("es-CO")} COP
              </strong>
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">
                  Monto a Ajustar (COP)
                </label>
                <input
                  type="number"
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(e.target.value)}
                  placeholder="20000"
                  className="w-full bg-[#121008] border border-white/15 rounded-xl py-2.5 px-3 text-sm text-white font-mono focus:outline-none focus:border-[#D4AF37]"
                />
                <div className="flex gap-2 mt-2">
                  {["10000", "20000", "50000", "100000"].map((preset) => (
                    <button
                      key={preset}
                      onClick={() => setCreditAmount(preset)}
                      className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[11px] font-mono text-gray-300 hover:border-[#D4AF37] hover:text-[#F3C966] cursor-pointer transition-all"
                    >
                      +${parseInt(preset, 10).toLocaleString("es-CO")}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">
                  Nota / Motivo
                </label>
                <input
                  type="text"
                  value={creditNote}
                  onChange={(e) => setCreditNote(e.target.value)}
                  className="w-full bg-[#121008] border border-white/15 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <button
                onClick={handleRechargeCredits}
                disabled={creditSubmitting}
                className="w-full h-11 glow-btn rounded-xl font-bold text-xs tracking-wider uppercase flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
              >
                {creditSubmitting ? "Procesando..." : "Confirmar Recarga"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
