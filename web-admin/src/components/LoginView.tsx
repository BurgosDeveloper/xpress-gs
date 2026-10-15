import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { ShieldCheck, Lock, Mail, AlertTriangle, ArrowRight, Eye, EyeOff } from "lucide-react";

export function LoginView() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError("Por favor ingresa usuario o correo y contraseña.");
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
    <div className="min-h-screen w-full flex items-center justify-center bg-[#0A0A08] relative overflow-hidden p-6">
      {/* Background Gold Luxury Glow Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-[#D4AF37] opacity-15 blur-[160px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[650px] h-[650px] rounded-full bg-[#B8860B] opacity-12 blur-[170px] pointer-events-none" />

      <div className="w-full max-w-[480px] z-10 flex flex-col items-center">
        {/* Brand Header */}
        <div className="text-center mb-8 w-full flex flex-col items-center">
          <img
            src="/logo_xpress.png"
            alt="Xpress Traslados"
            className="h-24 sm:h-28 w-auto object-contain filter drop-shadow-[0_0_30px_rgba(212,175,55,0.7)] mb-4"
          />
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white mb-2">
            XPRESS <span className="text-[#D4AF37]">TRASLADOS</span>
          </h1>
          <p className="text-xs uppercase tracking-[0.22em] text-[#D4AF37]/90 font-bold">
            Centro de Comando Satelital • Oficina Principal
          </p>
        </div>

        {/* Login Card */}
        <div className="w-full bg-[#121008]/95 backdrop-blur-2xl rounded-3xl p-8 sm:p-10 border border-[#D4AF37]/35 shadow-[0_25px_60px_rgba(0,0,0,0.95),0_0_40px_rgba(212,175,55,0.15)] relative">
          <div className="flex items-center gap-2.5 mb-6 pb-4 border-b border-white/10 text-xs font-bold text-[#D4AF37]">
            <ShieldCheck className="w-4 h-4 text-[#D4AF37] shrink-0" />
            <span className="tracking-wider">ACCESO RESTRINGIDO — EXCLUSIVO ADMINISTRADOR</span>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-red-950/50 border border-red-500/50 flex items-start gap-3 text-red-200 text-xs">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-red-300 mb-0.5">Fallo de Autenticación</p>
                <p className="text-red-200/90 leading-relaxed">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-2">
                Usuario o Correo Electrónico
              </label>
              <div className="relative flex items-center">
                <Mail className="w-4 h-4 text-[#D4AF37] absolute left-4 pointer-events-none" />
                <input
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin o admin@xpress.com"
                  className="w-full h-12 bg-[#18150B] border border-white/15 rounded-xl pl-11 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/30 transition-all font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-2">
                Contraseña de Administrador
              </label>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 text-[#D4AF37] absolute left-4 pointer-events-none" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full h-12 bg-[#18150B] border border-white/15 rounded-xl pl-11 pr-11 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/30 transition-all font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 text-gray-400 hover:text-white transition-colors cursor-pointer"
                  title={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-13 mt-4 rounded-xl bg-gradient-to-r from-[#F3C966] via-[#D4AF37] to-[#B8860B] text-black font-black text-sm tracking-wider uppercase flex items-center justify-center gap-2.5 shadow-[0_4px_25px_rgba(212,175,55,0.45)] hover:shadow-[0_4px_35px_rgba(212,175,55,0.7)] hover:brightness-110 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Ingresar a la Plataforma</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-5 border-t border-white/10 text-center">
            <p className="text-[11px] text-gray-400 font-medium">
              Conexión Encriptada SSL • Servidor de Producción Railway en Vivo
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
