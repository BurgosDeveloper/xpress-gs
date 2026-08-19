// ────────────────────────────────────────────────────────────────
// PRODUCCIÓN HARDCODEADA – Esta es la ÚNICA fuente de verdad.
// No depende de variables de entorno, ni de Metro, ni de EAS.
// ────────────────────────────────────────────────────────────────
const PROD_API = "https://xpress-production-cb01.up.railway.app/api";

const API_SUFFIX = "/api";

export function getApiBaseUrl(): string {
  // ── Producción (IPA / APK standalone) ──────────────────────
  // SIEMPRE devuelve la URL hardcodeada. Punto.
  if (!__DEV__) {
    return PROD_API;
  }

  // ── Desarrollo local (Expo Go) ─────────────────────────────
  // 1. Variable de entorno explícita (si la hay)
  const fromEnv = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (fromEnv && fromEnv.trim()) {
    let url = fromEnv.trim();
    if (!url.endsWith("/api")) url = url.replace(/\/+$/, "") + "/api";
    return url;
  }

  // 2. Adivinar IP local desde Metro bundler
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const maybe = require("expo-constants");
    const Constants = maybe?.default ?? maybe;
    const hostUri: unknown = Constants?.expoConfig?.hostUri;
    if (typeof hostUri === "string" && hostUri.length > 0) {
      const guessedHost = hostUri.split(":")[0];
      if (guessedHost) return `http://${guessedHost}:3001${API_SUFFIX}`;
    }
  } catch {
    // ignore
  }

  return PROD_API;
}

export function getServerOrigin(): string {
  const apiBase = getApiBaseUrl();
  if (apiBase.endsWith(API_SUFFIX)) return apiBase.slice(0, -API_SUFFIX.length);
  return apiBase;
}
