const API_SUFFIX = "/api";

const DEFAULT_PROD_API_BASE_URL = "https://xpress-production-c897.up.railway.app/api";

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

  // Intentar adivinar la IP local (LAN) para desarrollo local con Metro/Expo Go
  const guessed = guessLanApiBaseUrl();
  if (guessed) return guessed;

  // Fallback a producción en Railway para APKs independientes
  return DEFAULT_PROD_API_BASE_URL;
}

export function getServerOrigin() {
  const apiBase = getApiBaseUrl();
  if (apiBase.endsWith(API_SUFFIX)) return apiBase.slice(0, -API_SUFFIX.length);
  return apiBase;
}
