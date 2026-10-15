import React, { useEffect, useState } from "react";
import { apiGetAppConfig, apiUpdateAppConfig, AppConfig, PricingConfig } from "../services/api";
import { Settings, Save, RefreshCw, DollarSign, MessageCircle, ShieldCheck } from "lucide-react";

export function SettingsView() {
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);
  const [pricing, setPricing] = useState<PricingConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const res = await apiGetAppConfig();
      if (res.ok) {
        setAppConfig(res.appConfig);
        setPricing(res.pricing);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadConfig();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appConfig || !pricing) return;

    setSaving(true);
    try {
      await apiUpdateAppConfig({
        ...appConfig,
        ...pricing,
      });
      alert("Configuración actualizada con éxito en el servidor de producción.");
      void loadConfig();
    } catch (e: any) {
      alert(`Error al guardar: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading && !appConfig) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#050811] text-xs text-gray-400">
        <RefreshCw className="w-6 h-6 animate-spin text-[#00E5FF] mb-2" />
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col p-6 bg-[#0A0A08] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2.5">
            <Settings className="w-6 h-6 text-[#D4AF37]" />
            <span>Configuración del Sistema & Tarifas</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Ajuste de parámetros globales, tarifas de taxímetro y números de soporte oficial.
          </p>
        </div>

        <button
          onClick={loadConfig}
          disabled={loading}
          className="glass-panel px-4 py-2 rounded-xl flex items-center gap-2 text-xs font-bold text-white hover:border-[#D4AF37] hover:text-[#F3C966] cursor-pointer transition-all"
        >
          <RefreshCw className={`w-4 h-4 text-[#D4AF37] ${loading ? "animate-spin" : ""}`} />
          <span>Recargar</span>
        </button>
      </div>

      <form onSubmit={handleSave} className="max-w-4xl space-y-6">
        {/* Card: Tarifas Base */}
        <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-4">
          <h2 className="text-sm font-bold text-[#D4AF37] uppercase tracking-wider flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            <span>Tarifas Principales (COP)</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">
                Tarifa Base (Arranque)
              </label>
              <input
                type="number"
                value={pricing?.baseFare ?? 0}
                onChange={(e) => setPricing((p) => (p ? { ...p, baseFare: Number(e.target.value) } : null))}
                className="w-full bg-[#121008] border border-white/10 rounded-xl py-2 px-3 text-xs text-white font-mono focus:border-[#D4AF37] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">
                Precio por KM Adicional
              </label>
              <input
                type="number"
                value={pricing?.perKm ?? 0}
                onChange={(e) => setPricing((p) => (p ? { ...p, perKm: Number(e.target.value) } : null))}
                className="w-full bg-[#121008] border border-white/10 rounded-xl py-2 px-3 text-xs text-white font-mono focus:border-[#D4AF37] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">
                Radio de Búsqueda (Metros)
              </label>
              <input
                type="number"
                value={appConfig?.matchingRadiusM ?? 2000}
                onChange={(e) => setAppConfig((a) => (a ? { ...a, matchingRadiusM: Number(e.target.value) } : null))}
                className="w-full bg-[#121008] border border-white/10 rounded-xl py-2 px-3 text-xs text-white font-mono focus:border-[#D4AF37] focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Card: Canales de Atención WhatsApp */}
        <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-4">
          <h2 className="text-sm font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
            <MessageCircle className="w-4 h-4" />
            <span>Canales de Contacto Oficial WhatsApp</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">
                WhatsApp Operador ZOE (Atención al Cliente)
              </label>
              <input
                type="text"
                value={appConfig?.zoeWhatsappPhone ?? ""}
                onChange={(e) => setAppConfig((a) => (a ? { ...a, zoeWhatsappPhone: e.target.value } : null))}
                placeholder="+58414..."
                className="w-full bg-[#121008] border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:border-[#D4AF37] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">
                WhatsApp Administración / Pagos
              </label>
              <input
                type="text"
                value={appConfig?.adminWhatsappPhone ?? ""}
                onChange={(e) => setAppConfig((a) => (a ? { ...a, adminWhatsappPhone: e.target.value } : null))}
                placeholder="+58424..."
                className="w-full bg-[#121008] border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:border-[#D4AF37] focus:outline-none"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="glow-btn px-6 py-3 rounded-xl font-bold text-xs tracking-wider uppercase flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? "Guardando Cambios..." : "Guardar Configuración en Producción"}</span>
        </button>
      </form>
    </div>
  );
}
