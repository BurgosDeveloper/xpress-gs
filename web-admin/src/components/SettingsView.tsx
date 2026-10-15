import React, { useEffect, useState } from "react";
import { apiGetAppConfig, apiUpdateAppConfig, AppConfig, PricingConfig } from "../services/api";
import { Settings, Save, RefreshCw, DollarSign, MessageCircle, ShieldCheck, TrendingUp, CreditCard, Navigation, Percent } from "lucide-react";

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
      console.error("Error loading config:", e);
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
      alert("Configuración actualizada con éxito. Todos los cambios se aplicaron en tiempo real.");
      void loadConfig();
    } catch (e: any) {
      alert(`Error al guardar configuración: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading && !appConfig) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#0A0A08] text-xs text-gray-400">
        <RefreshCw className="w-6 h-6 animate-spin text-[#D4AF37] mb-2" />
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col p-6 bg-[#0A0A08] overflow-y-auto">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between mb-6 pb-4 border-b border-white/10">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2.5">
            <Settings className="w-6 h-6 text-[#D4AF37]" />
            <span>Configuración del Sistema & Tarifas</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Control de tarifas del taxímetro, tasas de cambio, comisiones y canales oficiales en tiempo real.
          </p>
        </div>

        <button
          onClick={loadConfig}
          disabled={loading}
          className="glass-panel px-4 py-2.5 rounded-xl flex items-center gap-2 text-xs font-bold text-white hover:border-[#D4AF37] hover:text-[#F3C966] cursor-pointer transition-all"
        >
          <RefreshCw className={`w-4 h-4 text-[#D4AF37] ${loading ? "animate-spin" : ""}`} />
          <span>Recargar</span>
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6 pb-12 max-w-6xl">
        {/* Card 1: Tarifas de Taxímetro */}
        <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h2 className="text-sm font-bold text-[#F3C966] uppercase tracking-wider flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-[#D4AF37]" />
              <span>Tarifas Principales del Taxímetro (COP)</span>
            </h2>
            <span className="text-[11px] text-gray-400 font-medium">Afecta el cálculo de viajes en la app</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">
                Tarifa Base (Arranque COP)
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
                Precio por KM Adicional (COP)
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
                Metros Incluidos en Base
              </label>
              <input
                type="number"
                value={pricing?.includedMeters ?? 1000}
                onChange={(e) => setPricing((p) => (p ? { ...p, includedMeters: Number(e.target.value) } : null))}
                className="w-full bg-[#121008] border border-white/10 rounded-xl py-2 px-3 text-xs text-white font-mono focus:border-[#D4AF37] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">
                Radio de Cobertura / Despacho (m)
              </label>
              <input
                type="number"
                value={appConfig?.matchingRadiusM ?? 2500}
                onChange={(e) => setAppConfig((a) => (a ? { ...a, matchingRadiusM: Number(e.target.value) } : null))}
                className="w-full bg-[#121008] border border-white/10 rounded-xl py-2 px-3 text-xs text-white font-mono focus:border-[#D4AF37] focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Card 2: Tasas de Cambio & Monedas */}
        <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h2 className="text-sm font-bold text-[#F3C966] uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#D4AF37]" />
              <span>Tasas de Cambio & Monedas (FX Multi-Divisa)</span>
            </h2>
            <span className="text-[11px] text-gray-400 font-medium">Conversión en vivo COP / USD / VES</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">
                Tasa COP por USD ($1 USD = X COP)
              </label>
              <input
                type="number"
                step="any"
                value={appConfig?.fxCopPerUsd ?? 4200}
                onChange={(e) => setAppConfig((a) => (a ? { ...a, fxCopPerUsd: Number(e.target.value) } : null))}
                className="w-full bg-[#121008] border border-white/10 rounded-xl py-2 px-3 text-xs text-white font-mono focus:border-[#D4AF37] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">
                Tasa COP por VES (1 VES = X COP)
              </label>
              <input
                type="number"
                step="any"
                value={appConfig?.fxCopPerVes ?? 100}
                onChange={(e) => setAppConfig((a) => (a ? { ...a, fxCopPerVes: Number(e.target.value) } : null))}
                className="w-full bg-[#121008] border border-white/10 rounded-xl py-2 px-3 text-xs text-white font-mono focus:border-[#D4AF37] focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Card 3: Comisión y Créditos del Conductor */}
        <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h2 className="text-sm font-bold text-[#F3C966] uppercase tracking-wider flex items-center gap-2">
              <Percent className="w-4 h-4 text-[#D4AF37]" />
              <span>Comisiones de la Plataforma & Descuento de Créditos</span>
            </h2>
            <span className="text-[11px] text-gray-400 font-medium">Cobro automático al finalizar carrera</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">
                Modalidad de Cobro de Crédito
              </label>
              <select
                value={appConfig?.driverCreditChargeMode ?? "SERVICE_VALUE"}
                onChange={(e) =>
                  setAppConfig((a) => (a ? { ...a, driverCreditChargeMode: e.target.value as any } : null))
                }
                className="w-full bg-[#121008] border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:border-[#D4AF37] focus:outline-none cursor-pointer"
              >
                <option value="SERVICE_VALUE">Porcentaje sobre el Valor de la Carrera (%)</option>
                <option value="FIXED_AMOUNT">Monto Fijo por Carrera Realizada</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">
                Porcentaje de Comisión (%)
              </label>
              <input
                type="number"
                step="any"
                value={appConfig?.driverCreditChargePercent ?? 10}
                onChange={(e) =>
                  setAppConfig((a) => (a ? { ...a, driverCreditChargePercent: Number(e.target.value) } : null))
                }
                className="w-full bg-[#121008] border border-white/10 rounded-xl py-2 px-3 text-xs text-white font-mono focus:border-[#D4AF37] focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Card 4: Canales Oficiales WhatsApp */}
        <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h2 className="text-sm font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-emerald-400" />
              <span>Canales Oficiales WhatsApp</span>
            </h2>
            <span className="text-[11px] text-gray-400 font-medium">Botones directos de soporte en la app</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                WhatsApp Administración / Finanzas
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

        {/* Card 5: Cuentas de Pago & Recarga de Saldo */}
        <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h2 className="text-sm font-bold text-[#F3C966] uppercase tracking-wider flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#D4AF37]" />
              <span>Cuentas de Pago & Recargas Oficiales</span>
            </h2>
            <span className="text-[11px] text-gray-400 font-medium">Información visible para recarga de ejecutivos</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">
                Titular Bancolombia
              </label>
              <input
                type="text"
                value={appConfig?.paymentBancolombiaHolder ?? ""}
                onChange={(e) => setAppConfig((a) => (a ? { ...a, paymentBancolombiaHolder: e.target.value } : null))}
                placeholder="Nombre o Razón Social"
                className="w-full bg-[#121008] border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:border-[#D4AF37] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">
                N° de Cuenta Bancolombia
              </label>
              <input
                type="text"
                value={appConfig?.paymentBancolombiaAccountNumber ?? ""}
                onChange={(e) =>
                  setAppConfig((a) => (a ? { ...a, paymentBancolombiaAccountNumber: e.target.value } : null))
                }
                placeholder="Ej. Ahorros 123-456789-00"
                className="w-full bg-[#121008] border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:border-[#D4AF37] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">
                Correo Zelle Oficial
              </label>
              <input
                type="email"
                value={appConfig?.paymentZelleEmail ?? ""}
                onChange={(e) => setAppConfig((a) => (a ? { ...a, paymentZelleEmail: e.target.value } : null))}
                placeholder="pagos@xpresstraslados.com"
                className="w-full bg-[#121008] border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:border-[#D4AF37] focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={saving}
            className="glow-btn px-8 py-3.5 rounded-xl font-extrabold text-xs tracking-wider uppercase flex items-center gap-2.5 cursor-pointer disabled:opacity-50 text-black shadow-[0_0_20px_rgba(212,175,55,0.4)]"
          >
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-black" />
                <span>Aplicando Cambios en Producción...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4 text-black" />
                <span>Guardar y Aplicar Configuración en Tiempo Real</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
