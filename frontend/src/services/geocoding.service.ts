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

// Catálogo ampliado y actualizado de destinos clave de alta frecuencia en San Cristóbal y Táchira (0ms)
export const POPULAR_SAN_CRISTOBAL_PLACES: GeocodingPlace[] = [
  {
    id: "sc-los-mangos",
    name: "Plaza Los Mangos",
    fullAddress: "Plaza Los Mangos, Barrio Obrero, San Cristóbal, Táchira",
    lat: 7.7708,
    lng: -72.2223,
  },
  {
    id: "sc-sambil",
    name: "Sambil San Cristóbal",
    fullAddress: "C.C. Sambil, Av. Antonio José de Sucre, Las Lomas, San Cristóbal",
    lat: 7.7942,
    lng: -72.2131,
  },
  {
    id: "sc-barrio-obrero",
    name: "Barrio Obrero",
    fullAddress: "Barrio Obrero (Calles 9 a 16, Carreras 19 a 22), San Cristóbal",
    lat: 7.7725,
    lng: -72.2205,
  },
  {
    id: "sc-pueblo-nuevo",
    name: "Pueblo Nuevo",
    fullAddress: "Av. España, Complejo Deportivo Pueblo Nuevo, San Cristóbal",
    lat: 7.7883,
    lng: -72.2039,
  },
  {
    id: "sc-hospital-central",
    name: "Hospital Central",
    fullAddress: "Hospital Central de San Cristóbal, Av. Lucio Oquendo, Táchira",
    lat: 7.7656,
    lng: -72.2331,
  },
  {
    id: "sc-terminal",
    name: "Terminal de Pasajeros",
    fullAddress: "Terminal de Pasajeros Genaro Méndez, La Concordia, San Cristóbal",
    lat: 7.7533,
    lng: -72.2272,
  },
  {
    id: "sc-plaza-bolivar",
    name: "Plaza Bolívar",
    fullAddress: "Plaza Bolívar, Casco Central, 5ta Avenida, San Cristóbal",
    lat: 7.7669,
    lng: -72.225,
  },
  {
    id: "sc-baratta",
    name: "C.C. e Hipermercado Baratta",
    fullAddress: "Centro Comercial Baratta, Av. Ferrero Tamayo, San Cristóbal",
    lat: 7.7815,
    lng: -72.2142,
  },
  {
    id: "sc-las-lomas",
    name: "C.C. Las Lomas",
    fullAddress: "Centro Comercial Las Lomas, Av. Los Agustinos, San Cristóbal",
    lat: 7.7801,
    lng: -72.2415,
  },
  {
    id: "sc-unet",
    name: "UNET",
    fullAddress: "Universidad Nacional Experimental del Táchira, Av. Universidad, Paramillo",
    lat: 7.7975,
    lng: -72.1994,
  },
  {
    id: "sc-ula",
    name: "ULA Táchira",
    fullAddress: "Universidad de Los Andes (PIRG), Paramillo, San Cristóbal",
    lat: 7.7911,
    lng: -72.1972,
  },
  {
    id: "sc-ucat-tejar",
    name: "UCAT - Loma del Tejar",
    fullAddress: "Universidad Católica del Táchira, Sede Loma del Tejar, San Cristóbal",
    lat: 7.7834,
    lng: -72.2289,
  },
  {
    id: "sc-ucat-bo",
    name: "UCAT - Barrio Obrero",
    fullAddress: "Universidad Católica del Táchira, Carrera 14 con Calle 14, Barrio Obrero",
    lat: 7.7721,
    lng: -72.2241,
  },
  {
    id: "sc-policlinica",
    name: "Policlínica Táchira",
    fullAddress: "Policlínica Táchira, Carrera 18 con Calle 10, Barrio Obrero",
    lat: 7.7719,
    lng: -72.2238,
  },
  {
    id: "sc-medico-andes",
    name: "Centro Médico Los Andes",
    fullAddress: "Centro Médico Quirúrgico Los Andes, Carrera 21, Barrio Obrero",
    lat: 7.7735,
    lng: -72.2198,
  },
  {
    id: "sc-seguro-social",
    name: "Seguro Social (Santa Teresa)",
    fullAddress: "Hospital Dr. Patrocinio Peñuela Ruiz (IVSS), Santa Teresa",
    lat: 7.7821,
    lng: -72.2312,
  },
  {
    id: "sc-hospital-militar",
    name: "Hospital Militar",
    fullAddress: "Hospital Militar de San Cristóbal, Av. Principal de Pueblo Nuevo",
    lat: 7.7912,
    lng: -72.2051,
  },
  {
    id: "sc-hospital-san-jose",
    name: "Hospital San José",
    fullAddress: "Hospital San José, Calle 4 con Carrera 12, La Concordia",
    lat: 7.7582,
    lng: -72.2279,
  },
  {
    id: "sc-rio-supermarket",
    name: "Río Supermarket",
    fullAddress: "Río Supermarket, Av. 19 de Abril / Pueblo Nuevo, San Cristóbal",
    lat: 7.7785,
    lng: -72.2112,
  },
  {
    id: "sc-garzon-rotaria",
    name: "Garzón Av. Rotaria",
    fullAddress: "Supermercado Garzón, Av. Rotaria, San Cristóbal",
    lat: 7.7521,
    lng: -72.2405,
  },
  {
    id: "sc-garzon-pn",
    name: "Garzón Pueblo Nuevo",
    fullAddress: "Supermercado Garzón, Av. Principal de Pueblo Nuevo, San Cristóbal",
    lat: 7.7878,
    lng: -72.2075,
  },
  {
    id: "sc-garzon-lomas",
    name: "Garzón Las Lomas",
    fullAddress: "Supermercado Garzón, C.C. Las Lomas, Av. Los Agustinos",
    lat: 7.7803,
    lng: -72.2418,
  },
  {
    id: "sc-farmatodo-bo",
    name: "Farmatodo Barrio Obrero",
    fullAddress: "Farmatodo, Carrera 21 frente a Plaza Los Mangos, Barrio Obrero",
    lat: 7.7711,
    lng: -72.222,
  },
  {
    id: "sc-farmatodo-pn",
    name: "Farmatodo Pueblo Nuevo",
    fullAddress: "Farmatodo, Av. Principal de Pueblo Nuevo, San Cristóbal",
    lat: 7.7865,
    lng: -72.2089,
  },
  {
    id: "sc-farmatodo-ferrero",
    name: "Farmatodo Ferrero Tamayo",
    fullAddress: "Farmatodo, Av. Ferrero Tamayo, San Cristóbal",
    lat: 7.7825,
    lng: -72.2138,
  },
  {
    id: "sc-cc-el-pinar",
    name: "C.C. El Pinar",
    fullAddress: "Centro Comercial El Pinar, Av. Principal de Pueblo Nuevo",
    lat: 7.7871,
    lng: -72.2081,
  },
  {
    id: "sc-cc-tama",
    name: "C.C. Tamá",
    fullAddress: "Centro Comercial Tamá, Av. 19 de Abril, San Cristóbal",
    lat: 7.7692,
    lng: -72.2135,
  },
  {
    id: "sc-cc-este",
    name: "C.C. del Este",
    fullAddress: "Centro Comercial del Este, Av. 19 de Abril, San Cristóbal",
    lat: 7.7681,
    lng: -72.2124,
  },
  {
    id: "sc-la-concordia",
    name: "La Concordia",
    fullAddress: "La Concordia, Av. Prolongación 5ta Avenida, San Cristóbal",
    lat: 7.7561,
    lng: -72.2289,
  },
  {
    id: "sc-pirineos",
    name: "Pirineos (I, II y III)",
    fullAddress: "Urbanización Pirineos, San Cristóbal, Táchira",
    lat: 7.7812,
    lng: -72.2085,
  },
  {
    id: "sc-quinimari",
    name: "Quinimarí",
    fullAddress: "Urbanización Quinimarí / La Popita, San Cristóbal",
    lat: 7.7731,
    lng: -72.2142,
  },
  {
    id: "sc-santa-teresa",
    name: "Santa Teresa",
    fullAddress: "Sector Santa Teresa, San Cristóbal, Táchira",
    lat: 7.7835,
    lng: -72.2335,
  },
  {
    id: "sc-paramillo",
    name: "Paramillo",
    fullAddress: "Sector Paramillo, San Cristóbal, Táchira",
    lat: 7.7945,
    lng: -72.1985,
  },
  {
    id: "sc-palo-gordo",
    name: "Palo Gordo",
    fullAddress: "Palo Gordo, Municipio Cárdenas, Táchira",
    lat: 7.8085,
    lng: -72.2012,
  },
  {
    id: "sc-tariba",
    name: "Táriba (Plaza Bolívar)",
    fullAddress: "Táriba Centro, Plaza Bolívar, Basílica Ntra. Sra. Consolación",
    lat: 7.8185,
    lng: -72.2231,
  },
  {
    id: "sc-palmira",
    name: "Palmira",
    fullAddress: "Palmira, Municipio Guásimos, Táchira",
    lat: 7.8421,
    lng: -72.2389,
  },
  {
    id: "sc-cordero",
    name: "Cordero",
    fullAddress: "Cordero, Municipio Andrés Bello, Táchira",
    lat: 7.8542,
    lng: -72.1852,
  },
  {
    id: "sc-capacho-nuevo",
    name: "Capacho Nuevo",
    fullAddress: "Capacho Nuevo, Municipio Independencia, Táchira",
    lat: 7.7892,
    lng: -72.3121,
  },
  {
    id: "sc-capacho-viejo",
    name: "Capacho Viejo",
    fullAddress: "Capacho Viejo, Municipio Libertad, Táchira",
    lat: 7.7981,
    lng: -72.3315,
  },
  {
    id: "sc-peribeca",
    name: "Peribeca",
    fullAddress: "Pueblo Turístico de Peribeca, Municipio Capacho Nuevo, Táchira",
    lat: 7.8121,
    lng: -72.3052,
  },
  {
    id: "sc-san-josecito",
    name: "San Josecito",
    fullAddress: "San Josecito, Municipio Torbes, Táchira",
    lat: 7.6651,
    lng: -72.2415,
  },
  {
    id: "sc-rubio",
    name: "Rubio",
    fullAddress: "Rubio Centro, Municipio Junín, Táchira",
    lat: 7.7025,
    lng: -72.3581,
  },
  {
    id: "sc-aeropuerto-santo-domingo",
    name: "Aeropuerto Santo Domingo",
    fullAddress: "Aeropuerto Mayor Buenaventura Vivas, Santo Domingo, Táchira",
    lat: 7.5652,
    lng: -72.0621,
  },
  {
    id: "sc-san-antonio",
    name: "San Antonio del Táchira",
    fullAddress: "San Antonio del Táchira, Municipio Bolívar, Frontera Táchira",
    lat: 7.8142,
    lng: -72.4412,
  },
];

// Caché en memoria para evitar peticiones redundantes
const searchCache = new Map<string, { data: GeocodingPlace[]; ts: number }>();
const CACHE_TTL_MS = 1000 * 60 * 15; // 15 minutos
const CACHE_MAX = 80;

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
 * Busca lugares localmente en el catálogo popular de San Cristóbal y Táchira (0ms).
 */
function searchLocalPlaces(query: string): GeocodingPlace[] {
  const norm = normalizeSearchText(query);
  if (!norm) return [];

  return POPULAR_SAN_CRISTOBAL_PLACES.filter((p) => {
    const nameNorm = normalizeSearchText(p.name);
    const addrNorm = normalizeSearchText(p.fullAddress);
    return nameNorm.includes(norm) || addrNorm.includes(norm);
  });
}

/**
 * Calcula un puntaje de prioridad para asegurar que destinos de Táchira y San Cristóbal
 * aparezcan invariablemente de primeros en las sugerencias.
 */
function getTachiraScore(p: GeocodingPlace, queryNorm: string, proximity = DEFAULT_PROXIMITY): number {
  let score = 0;
  const nameNorm = normalizeSearchText(p.name);
  const addrNorm = normalizeSearchText(p.fullAddress);
  const fullText = `${nameNorm} ${addrNorm}`;

  // Coincidencia exacta con el nombre en catálogo local
  const isLocal = POPULAR_SAN_CRISTOBAL_PLACES.some((u) => u.id === p.id);
  if (isLocal) {
    score += 1000;
  }

  if (nameNorm.startsWith(queryNorm)) {
    score += 400;
  } else if (nameNorm.includes(queryNorm)) {
    score += 250;
  }

  // Palabras clave inequívocas de Táchira
  const tachiraKeywords = [
    "tachira",
    "san cristobal",
    "tariba",
    "pueblo nuevo",
    "barrio obrero",
    "la concordia",
    "pirineos",
    "las lomas",
    "capacho",
    "palmira",
    "cordero",
    "rubio",
    "san antonio",
    "peribeca",
    "sambil",
    "los mangos",
    "unet",
    "ula",
    "ucat",
    "hospital central",
  ];
  if (tachiraKeywords.some((k) => fullText.includes(k))) {
    score += 300;
  }

  // Dentro del rectángulo geográfico de Táchira
  if (p.lat >= 7.3 && p.lat <= 8.4 && p.lng >= -72.6 && p.lng <= -71.8) {
    score += 500;
    // Bonificación adicional por cercanía al centro de San Cristóbal
    const dLat = Math.abs(p.lat - proximity.lat);
    const dLng = Math.abs(p.lng - proximity.lng);
    score += Math.max(0, 100 - (dLat + dLng) * 500);
  }

  return score;
}

/**
 * Busca direcciones y lugares combinando catálogo local instantáneo con
/**
 * Busca ubicaciones en OpenStreetMap / Photon (cobertura total de comercios, panaderías, clínicas, calles y sectores de San Cristóbal y Táchira).
 */
async function searchPhotonPlaces(query: string, proximity = DEFAULT_PROXIMITY): Promise<GeocodingPlace[]> {
  try {
    const url = new URL("https://photon.komoot.io/api/");
    url.searchParams.set("q", query);
    url.searchParams.set("lat", String(proximity.lat));
    url.searchParams.set("lon", String(proximity.lng));
    url.searchParams.set("bbox", "-72.60,7.30,-72.00,8.40");
    url.searchParams.set("limit", "10");

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) return [];
    const json = await res.json();
    const features = Array.isArray(json?.features) ? json.features : [];

    return features
      .map((f: any) => {
        const coords = f?.geometry?.coordinates;
        if (!Array.isArray(coords) || coords.length < 2) return null;
        const lng = Number(coords[0]);
        const lat = Number(coords[1]);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

        const p = f.properties || {};
        const name = p.name || p.street || query;
        const parts = [
          p.name,
          p.street,
          p.district || p.locality,
          p.city,
          "Táchira",
        ].filter(Boolean);

        const uniqueParts: string[] = [];
        for (const part of parts) {
          if (!uniqueParts.some((u) => u.toLowerCase() === String(part).toLowerCase())) {
            uniqueParts.push(String(part));
          }
        }

        return {
          id: `osm-${p.osm_id || `${lat},${lng}`}`,
          name: String(name),
          fullAddress: uniqueParts.join(", "),
          lat,
          lng,
        };
      })
      .filter((item: any): item is GeocodingPlace => item !== null);
  } catch {
    return [];
  }
}

/**
 * Busca en Mapbox Places Geocoding v5 acotado al estado Táchira.
 */
async function searchMapboxPlaces(query: string, proximity = DEFAULT_PROXIMITY): Promise<GeocodingPlace[]> {
  const token = await getMapboxToken();
  if (!token) return [];

  try {
    const url = new URL(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`
    );
    url.searchParams.set("access_token", token);
    url.searchParams.set("proximity", `${proximity.lng},${proximity.lat}`);
    url.searchParams.set("country", "ve");
    url.searchParams.set("bbox", "-72.60,7.30,-72.00,8.40");
    url.searchParams.set("language", "es");
    url.searchParams.set("types", "poi,address,neighborhood,locality,place");
    url.searchParams.set("limit", "10");

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (res.ok) {
      const json = await res.json();
      const features = Array.isArray(json?.features) ? json.features : [];

      return features
        .map((f: any) => {
          const coords = Array.isArray(f.center) ? f.center : null;
          if (!coords || coords.length < 2) return null;
          const lng = Number(coords[0]);
          const lat = Number(coords[1]);
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

          return {
            id: String(f.id || `${lat},${lng}`),
            name: String(f.text || f.place_name || query),
            fullAddress: String(f.place_name || f.text || query),
            lat,
            lng,
          };
        })
        .filter((p: any): p is GeocodingPlace => p !== null);
    }
  } catch {
    // Silencioso
  }
  return [];
}

/**
 * Busca direcciones y lugares combinando catálogo local instantáneo con
 * Photon (OpenStreetMap) y Mapbox Places Geocoding v5 acotado estrictamente a Táchira.
 */
export async function searchPlaces(
  query: string,
  proximity = DEFAULT_PROXIMITY
): Promise<GeocodingPlace[]> {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) return [];

  const queryNorm = normalizeSearchText(trimmed);
  const cacheKey = `${queryNorm}_${proximity.lat.toFixed(3)}_${proximity.lng.toFixed(3)}`;
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return cached.data;
  }

  // 1. Coincidencias locales inmediatas (0ms)
  const localMatches = searchLocalPlaces(trimmed);

  // 2. Búsqueda remota concurrente en Photon (OpenStreetMap) y Mapbox Places
  const [photonMatches, mapboxMatches] = await Promise.all([
    searchPhotonPlaces(trimmed, proximity),
    searchMapboxPlaces(trimmed, proximity),
  ]);

  // 3. Fallback adicional con Expo Location si los servicios anteriores no retornaron nada
  let expoMatches: GeocodingPlace[] = [];
  if (localMatches.length === 0 && photonMatches.length === 0 && mapboxMatches.length === 0) {
    try {
      const results = await Location.geocodeAsync(`${trimmed}, San Cristóbal, Táchira`);
      if (Array.isArray(results) && results.length > 0) {
        expoMatches = results.slice(0, 5).map((r, idx) => ({
          id: `local-${idx}-${r.latitude.toFixed(4)}`,
          name: trimmed,
          fullAddress: `${trimmed}, San Cristóbal, Táchira`,
          lat: r.latitude,
          lng: r.longitude,
        }));
      }
    } catch {
      // Silencioso
    }
  }

  // 4. Combinar, deduplicar por cercanía geográfica (<50 metros)
  const combined = [...localMatches, ...photonMatches, ...mapboxMatches, ...expoMatches];
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

  // 5. Ordenar con estricta prioridad de Táchira (Score)
  uniquePlaces.sort((a, b) => {
    const scoreA = getTachiraScore(a, queryNorm, proximity);
    const scoreB = getTachiraScore(b, queryNorm, proximity);
    return scoreB - scoreA;
  });

  const finalResults = uniquePlaces.slice(0, 10);

  if (finalResults.length > 0) {
    if (searchCache.size >= CACHE_MAX) {
      const firstKey = searchCache.keys().next().value;
      if (firstKey) searchCache.delete(firstKey);
    }
    searchCache.set(cacheKey, { data: finalResults, ts: Date.now() });
  }

  return finalResults;
}
