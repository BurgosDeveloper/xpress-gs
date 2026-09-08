import * as Location from "expo-location";

export interface GeocodingPlace {
  id: string;
  name: string;
  fullAddress: string;
  lat: number;
  lng: number;
}

// Centro de referencia: San Cristóbal, Táchira
const DEFAULT_PROXIMITY = { lat: 7.7669, lng: -72.225 };

// Lugares y puntos clave de alta frecuencia en San Cristóbal para respuesta instantánea (0ms)
export const POPULAR_SAN_CRISTOBAL_PLACES: GeocodingPlace[] = [
  {
    id: "sc-los-mangos",
    name: "Plaza Los Mangos",
    fullAddress: "Plaza Los Mangos, Barrio Obrero, San Cristóbal",
    lat: 7.7708,
    lng: -72.2223,
  },
  {
    id: "sc-sambil",
    name: "Sambil San Cristóbal",
    fullAddress: "Centro Comercial Sambil, Av. Antonio José de Sucre",
    lat: 7.7942,
    lng: -72.2131,
  },
  {
    id: "sc-hospital-central",
    name: "Hospital Central",
    fullAddress: "Hospital Central de San Cristóbal, Av. Lucio Oquendo",
    lat: 7.7656,
    lng: -72.2331,
  },
  {
    id: "sc-terminal",
    name: "Terminal de Pasajeros",
    fullAddress: "Terminal de Pasajeros de San Cristóbal, La Concordia",
    lat: 7.7533,
    lng: -72.2272,
  },
  {
    id: "sc-unet",
    name: "UNET",
    fullAddress: "Universidad Nacional Experimental del Táchira, Av. Universidad",
    lat: 7.7975,
    lng: -72.1994,
  },
  {
    id: "sc-ula",
    name: "ULA Táchira",
    fullAddress: "Universidad de Los Andes, Paramillo, San Cristóbal",
    lat: 7.7911,
    lng: -72.1972,
  },
  {
    id: "sc-pueblo-nuevo",
    name: "Polideportivo Pueblo Nuevo",
    fullAddress: "Complejo Deportivo Pueblo Nuevo, San Cristóbal",
    lat: 7.7883,
    lng: -72.2039,
  },
  {
    id: "sc-plaza-bolivar",
    name: "Plaza Bolívar",
    fullAddress: "Plaza Bolívar, Casco Central, San Cristóbal",
    lat: 7.7669,
    lng: -72.225,
  },
  {
    id: "sc-barrio-obrero",
    name: "Barrio Obrero",
    fullAddress: "Barrio Obrero, San Cristóbal, Táchira",
    lat: 7.7725,
    lng: -72.2205,
  },
  {
    id: "sc-la-concordia",
    name: "La Concordia",
    fullAddress: "La Concordia, San Cristóbal, Táchira",
    lat: 7.7561,
    lng: -72.2289,
  },
  {
    id: "sc-pirineos",
    name: "Pirineos",
    fullAddress: "Urbanización Pirineos, San Cristóbal, Táchira",
    lat: 7.7812,
    lng: -72.2085,
  },
  {
    id: "sc-las-lomas",
    name: "Las Lomas",
    fullAddress: "Las Lomas, San Cristóbal, Táchira",
    lat: 7.7801,
    lng: -72.2415,
  },
];

// Caché en memoria para evitar peticiones redundantes
const searchCache = new Map<string, { data: GeocodingPlace[]; ts: number }>();
const CACHE_TTL_MS = 1000 * 60 * 15; // 15 minutos
const CACHE_MAX = 60;

let resolvedMapboxToken: string | null = null;

async function getMapboxToken(): Promise<string | null> {
  if (resolvedMapboxToken) return resolvedMapboxToken;

  const envToken =
    process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ||
    process.env.MAPBOX_ACCESS_TOKEN;

  if (envToken && String(envToken).trim()) {
    resolvedMapboxToken = String(envToken).trim();
    return resolvedMapboxToken;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const MapboxGL = require("@rnmapbox/maps").default;
    if (MapboxGL && typeof MapboxGL.getAccessToken === "function") {
      const nativeToken = await MapboxGL.getAccessToken();
      if (nativeToken && String(nativeToken).trim()) {
        resolvedMapboxToken = String(nativeToken).trim();
        return resolvedMapboxToken;
      }
    }
  } catch {
    // ignore
  }

  return null;
}

/**
 * Normaliza cadenas de texto para comparaciones sin tildes ni mayúsculas.
 */
function normalizeSearchText(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/**
 * Busca lugares localmente en el catálogo popular de San Cristóbal (0ms).
 */
function searchLocalPlaces(query: string): GeocodingPlace[] {
  const norm = normalizeSearchText(query);
  if (!norm) return [];

  return POPULAR_SAN_CRISTOBAL_PLACES.filter(
    (p) =>
      normalizeSearchText(p.name).includes(norm) ||
      normalizeSearchText(p.fullAddress).includes(norm)
  );
}

/**
 * Busca direcciones y lugares combinando catálogo local instantáneo con
 * la API de Mapbox Places Geocoding v5 y fallback a Expo Location.
 */
export async function searchPlaces(
  query: string,
  proximity = DEFAULT_PROXIMITY
): Promise<GeocodingPlace[]> {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) return [];

  const cacheKey = `${normalizeSearchText(trimmed)}_${proximity.lat.toFixed(3)}_${proximity.lng.toFixed(3)}`;
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return cached.data;
  }

  // 1. Coincidencias locales inmediatas (0ms)
  const localMatches = searchLocalPlaces(trimmed);

  // 2. Búsqueda remota en Mapbox Places
  let mapboxMatches: GeocodingPlace[] = [];
  const token = await getMapboxToken();

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
      url.searchParams.set("limit", "8");

      const res = await fetch(url.toString(), {
        method: "GET",
        headers: { Accept: "application/json" },
      });

      if (res.ok) {
        const json = await res.json();
        const features = Array.isArray(json?.features) ? json.features : [];

        mapboxMatches = features
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
      }
    } catch {
      // Fallback a Expo Location si hay fallo con Mapbox
    }
  }

  // 3. Si no hubo resultados en Mapbox, intentar Expo Location
  let expoMatches: GeocodingPlace[] = [];
  if (localMatches.length === 0 && mapboxMatches.length === 0) {
    try {
      const results = await Location.geocodeAsync(trimmed);
      if (Array.isArray(results) && results.length > 0) {
        expoMatches = results.slice(0, 5).map((r, idx) => ({
          id: `local-${idx}-${r.latitude.toFixed(4)}`,
          name: trimmed,
          fullAddress: `${trimmed}, San Cristóbal`,
          lat: r.latitude,
          lng: r.longitude,
        }));
      }
    } catch {
      // Silencioso
    }
  }

  // Combinar y deduplicar por proximidad de coordenadas (<50m)
  const combined = [...localMatches, ...mapboxMatches, ...expoMatches];
  const uniquePlaces: GeocodingPlace[] = [];

  for (const place of combined) {
    const isDuplicate = uniquePlaces.some(
      (u) =>
        Math.abs(u.lat - place.lat) < 0.0005 &&
        Math.abs(u.lng - place.lng) < 0.0005
    );
    if (!isDuplicate) {
      uniquePlaces.push(place);
    }
  }

  const finalResults = uniquePlaces.slice(0, 8);

  if (finalResults.length > 0) {
    if (searchCache.size >= CACHE_MAX) {
      const firstKey = searchCache.keys().next().value;
      if (firstKey) searchCache.delete(firstKey);
    }
    searchCache.set(cacheKey, { data: finalResults, ts: Date.now() });
  }

  return finalResults;
}
