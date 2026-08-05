const API_SUFFIX = "/api";

const DEFAULT_PROD_API_BASE_URL = "https://xpress-production-cb01.up.railway.app/api";

function guessLanApiBaseUrl() {
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

  return null;
}

export function getApiBaseUrl() {
  const fromEnv = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (fromEnv && fromEnv.trim()) return fromEnv.trim();

  // En producción (APKs e IPAs independientes), usar SIEMPRE el servidor seguro HTTPS en Railway
  if (!__DEV__) {
    return DEFAULT_PROD_API_BASE_URL;
  }

  // Únicamente en desarrollo local (__DEV__ con Expo Go), intentar adivinar la IP local
  const guessed = guessLanApiBaseUrl();
  if (guessed) return guessed;

  return DEFAULT_PROD_API_BASE_URL;
}

export function getServerOrigin() {
  const apiBase = getApiBaseUrl();
  if (apiBase.endsWith(API_SUFFIX)) return apiBase.slice(0, -API_SUFFIX.length);
  return apiBase;
}
