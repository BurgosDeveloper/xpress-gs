import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { ShieldCheck, Lock, Mail, AlertTriangle, ArrowRight, Radio } from "lucide-react";

export function LoginView() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError("Por favor ingresa correo y contraseña.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await login(email, password);
    } catch (err: any) {
      setError(err?.message || "Credenciales incorrectas o acceso no autorizado.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#050811] relative overflow-hidden p-4">
      {/* Background Neon Glow Orbs */}
      <div className="absolute top-[-15%] left-[-10%] w-[550px] h-[550px] rounded-full bg-[#0000FF] opacity-20 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-[#00E5FF] opacity-15 blur-[140px] pointer-events-none" />

      <div className="w-full max-w-[440px] z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#0A1026] border-2 border-[#0000FF] shadow-[0_0_25px_rgba(0,0,255,0.6)] mb-4">
            <Radio className="w-8 h-8 text-[#00E5FF] animate-pulse" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">
            XPRESS <span className="text-[#00E5FF]">TRASLADOS</span>
          </h1>
          <p className="text-xs uppercase tracking-widest text-[#8892B0] font-semibold">
            Centro de Comando Satelital • Oficina Principal
          </p>
        </div>

        {/* Login Card */}
        <div className="glass-panel-neon rounded-2xl p-8 shadow-2xl relative">
          <div className="flex items-center gap-2 mb-6 pb-4 border-b border-white/10 text-xs font-semibold text-[#00E5FF]">
            <ShieldCheck className="w-4 h-4 text-[#00E5FF]" />
            <span>ACCESO RESTRINGIDO — EXCLUSIVO ADMINISTRADOR</span>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-950/40 border border-red-500/40 flex items-start gap-3 text-red-200 text-xs animate-shake">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-red-300 mb-0.5">Fallo de Autenticación</p>
                <p>{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-2">
                Usuario o Correo Electrónico
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin o admin@xpress.com"
                  className="w-full bg-[#050811]/90 border border-white/15 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#0000FF] focus:ring-2 focus:ring-[#0000FF]/40 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-2">
                Contraseña de Administrador
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-[#050811]/90 border border-white/15 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#0000FF] focus:ring-2 focus:ring-[#0000FF]/40 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 glow-btn text-white rounded-xl font-bold text-sm tracking-wide flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Ingresar a la Plataforma</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-white/5 text-center">
            <p className="text-[11px] text-gray-500">
              Conexión protegida SSL • Servidor de Producción Railway en Vivo
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
