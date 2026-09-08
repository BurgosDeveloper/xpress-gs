import * as Location from "expo-location";

export interface GeocodingPlace {
  id: string;
  name: string;
  fullAddress: string;
  lat: number;
  lng: number;
}

// Centro por defecto: San Cristóbal, Táchira
const DEFAULT_PROXIMITY = { lat: 7.7669, lng: -72.225 };

// Caché en memoria para evitar peticiones redundantes
const searchCache = new Map<string, { data: GeocodingPlace[]; ts: number }>();
const CACHE_TTL_MS = 1000 * 60 * 15; // 15 minutos
const CACHE_MAX = 50;

function getMapboxToken(): string | null {
  const token =
    process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ||
    process.env.MAPBOX_ACCESS_TOKEN;
  return token && String(token).trim() ? String(token).trim() : null;
}

/**
 * Busca direcciones y lugares mediante la API de Mapbox Places Geocoding v5.
 * Con sesgo de proximidad hacia San Cristóbal / Táchira y fallback a Expo Location.
 */
export async function searchPlaces(
  query: string,
  proximity = DEFAULT_PROXIMITY
): Promise<GeocodingPlace[]> {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) return [];

  const cacheKey = `${trimmed.toLowerCase()}_${proximity.lat.toFixed(3)}_${proximity.lng.toFixed(3)}`;
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return cached.data;
  }

  const token = getMapboxToken();

  if (token) {
    try {
      const url = new URL(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(trimmed)}.json`
      );
      url.searchParams.set("access_token", token);
      url.searchParams.set("proximity", `${proximity.lng},${proximity.lat}`);
      url.searchParams.set("country", "ve,co");
      url.searchParams.set("language", "es");
      url.searchParams.set("types", "poi,address,neighborhood,locality,place");
      url.searchParams.set("limit", "6");

      const res = await fetch(url.toString(), {
        method: "GET",
        headers: { Accept: "application/json" },
      });

      if (res.ok) {
        const json = await res.json();
        const features = Array.isArray(json?.features) ? json.features : [];

        const places: GeocodingPlace[] = features
          .map((f: any) => {
            const coords = Array.isArray(f.center) ? f.center : null;
            if (!coords || coords.length < 2) return null;
            const lng = Number(coords[0]);
            const lat = Number(coords[1]);
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

            return {
              id: String(f.id || `${lat},${lng}`),
              name: String(f.text || f.place_name || trimmed),
              fullAddress: String(f.place_name || f.text || trimmed),
              lat,
              lng,
            };
          })
          .filter((p: any): p is GeocodingPlace => p !== null);

        if (places.length > 0) {
          if (searchCache.size >= CACHE_MAX) {
            const firstKey = searchCache.keys().next().value;
            if (firstKey) searchCache.delete(firstKey);
          }
          searchCache.set(cacheKey, { data: places, ts: Date.now() });
          return places;
        }
      }
    } catch {
      // Fallback a Expo Location si hay fallo de red con Mapbox
    }
  }

  // Fallback nativo: expo-location
  try {
    const results = await Location.geocodeAsync(trimmed);
    if (Array.isArray(results) && results.length > 0) {
      const places: GeocodingPlace[] = results.slice(0, 5).map((r, idx) => ({
        id: `local-${idx}-${r.latitude.toFixed(4)}`,
        name: trimmed,
        fullAddress: trimmed,
        lat: r.latitude,
        lng: r.longitude,
      }));

      return places;
    }
  } catch {
    // Silencioso
  }

  return [];
}
