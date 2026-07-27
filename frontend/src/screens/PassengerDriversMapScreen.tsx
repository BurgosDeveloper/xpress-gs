import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Image, Linking, Pressable, StyleSheet, Text, View, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { AppMap, type AppMapMarker, type AppMapPolyline, type AppMapRef, type LatLng, type Region } from "../components/AppMap";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSocket } from "../realtime/SocketProvider";
import { Card } from "../components/Card";
import { GoldTitle } from "../components/GoldTitle";
import { PrimaryButton } from "../components/PrimaryButton";
import { SecondaryButton } from "../components/SecondaryButton";
import { colors } from "../theme/colors";
import { useAuth } from "../auth/AuthContext";
import { formatCop, formatSecondaryFromCop } from "../utils/currency";
import { apiCreateRide, apiNearbyDrivers } from "../rides/rides.api";
import type { NearbyDriver, ServiceType } from "../rides/rides.types";
import { apiEstimateOffer } from "../offers/offers.api";
import { buildWhatsappLink } from "../utils/whatsapp";
import { serviceTypeHasCargo, serviceTypeIconName, serviceTypeLabel } from "../utils/serviceType";
import { absoluteUrl } from "../utils/url";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/AppNavigator";
import { getLastCoords } from "../lib/locationCache";
import { ensureForegroundPermission, getCurrentCoords, getFastCoords } from "../utils/location";
import { setActiveRideOffersRideId } from "../lib/storage";
import { ApiError } from "../lib/api";
import { apiGetPublicZones, type PublicZone } from "../config/config.api";
import { getMatchingRadiusM } from "../config/matchingRadius";
import { getDrivingRoute } from "../utils/directions";

type Props = NativeStackScreenProps<RootStackParamList, "PassengerDriversMap">;

type MapPoint = { lat: number; lng: number };

function regionFromCenter(center: MapPoint, zoomHint?: "close" | "normal"): Region {
  const delta = zoomHint === "close" ? 0.00082 : 0.03;
  return { latitude: center.lat, longitude: center.lng, latitudeDelta: delta, longitudeDelta: delta };
}

function toLatLng(p: MapPoint): LatLng {
  return { latitude: p.lat, longitude: p.lng };
}


function formatAgo(updatedAtIso: string) {
  const t = new Date(updatedAtIso).getTime();
  const diff = Math.max(0, Date.now() - t);
  const sec = Math.round(diff / 1000);
  if (sec < 60) return `hace ${sec}s`;
  const min = Math.round(sec / 60);
  if (min < 60) return `hace ${min}m`;
  const hr = Math.round(min / 60);
  return `hace ${hr}h`;
}

function formatReverseGeocoded(addr: Location.LocationGeocodedAddress | null | undefined) {
  if (!addr) return null;

  const street = [addr.street, addr.name].filter(Boolean).join(" ").trim();
  const district = (addr.district || addr.subregion || "").trim();
  const city = (addr.city || addr.region || "").trim();

  const first = [street, district].filter(Boolean).join(", ").trim();
  const full = [first, city].filter(Boolean).join(", ").trim();
  return full || null;
}

function downsampleRoutePath(path: { lat: number; lng: number }[], maxPoints: number) {
  const max = Math.max(2, Math.floor(maxPoints));
  if (path.length <= max) return path;

  const stride = Math.ceil(path.length / max);
  const out: { lat: number; lng: number }[] = [];
  for (let i = 0; i < path.length; i += stride) out.push(path[i]);

  const last = path[path.length - 1];
  const lastOut = out[out.length - 1];
  if (!lastOut || lastOut.lat !== last.lat || lastOut.lng !== last.lng) out.push(last);
  return out.length > max ? out.slice(0, max) : out;
}

function routeRequestKey(from?: MapPoint | null, to?: MapPoint | null) {
  if (!from || !to) return "";
  const r = (n: number) => Math.round(n * 1e5) / 1e5;
  return `${r(from.lat)},${r(from.lng)}->${r(to.lat)},${r(to.lng)}`;
}

const ROUTE_PAYLOAD_MAX_POINTS = 450;

export function PassengerDriversMapScreen({ navigation, route }: Props) {
  const auth = useAuth();
  const token = auth.token;
  const matchingRadiusM = getMatchingRadiusM(auth.appConfig);

  // Fallback inmediato mientras se obtiene GPS real.
  const fallbackCenter = useMemo(() => ({ lat: 7.7669, lng: -72.2250 }), []);

  const insets = useSafeAreaInsets();
  const { socket } = useSocket();

  const [center, setCenter] = useState<{ lat: number; lng: number }>(fallbackCenter);
  const [items, setItems] = useState<NearbyDriver[]>([]);
  const [selected, setSelected] = useState<NearbyDriver | null>(null);
  const [wantedMode, setWantedMode] = useState<import("../rides/rides.types").ServiceMode>(route.params?.serviceModeWanted || "TRASLADO");
  const [wantedType, setWantedType] = useState<ServiceType>(route.params?.serviceTypeWanted || "CARRO");
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [loadingDrivers, setLoadingDrivers] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requesting, setRequesting] = useState(false);

  const [dropoff, setDropoff] = useState<{ lat: number; lng: number } | null>(null);
  const [pickupAddress, setPickupAddress] = useState<string | null>(null);
  const [dropoffAddress, setDropoffAddress] = useState<string | null>(null);

  const [estimating, setEstimating] = useState(false);
  const [estimate, setEstimate] = useState<{
    distanceMeters: number;
    estimatedPrice: number;
    durationSeconds?: number;
    isFixedPrice: boolean;
    fixedPriceCop?: number | null;
    routePath?: { lat: number; lng: number }[] | null;
  } | null>(null);
  const [routePreview, setRoutePreview] = useState<{
    distanceMeters: number;
    durationSeconds?: number;
    routePath: { lat: number; lng: number }[] | null;
  } | null>(null);
  const [routePreviewKey, setRoutePreviewKey] = useState<string | null>(null);
  const [estimateKey, setEstimateKey] = useState<string | null>(null);
  const [customFare, setCustomFare] = useState<number | null>(null);
  const [routePreviewLoading, setRoutePreviewLoading] = useState(false);

  const [zones, setZones] = useState<PublicZone[]>([]);

  const operatorPhone = useMemo(() => {
    const fromConfig = auth.appConfig?.zoeWhatsappPhone;
    const fromEnv = process.env.EXPO_PUBLIC_OPERATOR_PHONE;
    return (fromConfig && fromConfig.trim()) || (fromEnv && fromEnv.trim()) || "04245687814";
  }, [auth.appConfig?.zoeWhatsappPhone]);

  const operatorLink = useMemo(() => {
    return buildWhatsappLink({
      phone: operatorPhone,
      text: "Hola, necesito ayuda de ZOE.",
    });
  }, [operatorPhone]);

  async function openOperator() {
    await Linking.openURL(operatorLink);
  }

  const initialCenter = useMemo(() => {
    const lat = center?.lat ?? fallbackCenter.lat;
    const lng = center?.lng ?? fallbackCenter.lng;
    return { lat, lng };
  }, [center?.lat, center?.lng, fallbackCenter.lat, fallbackCenter.lng]);

  const locationReadyRef = useRef(false);
  const driversLoadedRef = useRef(false);
  const locationSeqRef = useRef(0);
  const driversSeqRef = useRef(0);
  const routePreviewSeqRef = useRef(0);
  const estimateSeqRef = useRef(0);
  const requestingRef = useRef(false);
  const manualEstimateRef = useRef(false);
  const estimateInFlightRef = useRef(false);

  const lastDriversKeyRef = useRef<string>("");
  const currentRouteKey = useMemo(() => routeRequestKey(center, dropoff), [center?.lat, center?.lng, dropoff?.lat, dropoff?.lng]);

  const userInteractedRef = useRef(false);
  const shouldRecenterRef = useRef(false);
  const hasAutoCenteredRef = useRef(false);
  const mapReadyRef = useRef(false);

  const mapRef = useRef<AppMapRef | null>(null);

  useEffect(() => {
    if (!socket) return;
    
    const onLocationUpdate = (data: { driverId: string; lat: number; lng: number }) => {
      setItems((currentItems) => {
        const idx = currentItems.findIndex(d => d.driverId === data.driverId);
        if (idx === -1) return currentItems;
        
        const newItems = [...currentItems];
        newItems[idx] = {
          ...newItems[idx],
          location: {
            ...newItems[idx].location,
            lat: data.lat,
            lng: data.lng,
            updatedAt: new Date().toISOString(),
          }
        };
        return newItems;
      });
    };

    socket.on("driver_location_update", onLocationUpdate);
    return () => {
      socket.off("driver_location_update", onLocationUpdate);
    };
  }, [socket]);

  useEffect(() => {
    const canAutoCenter = !userInteractedRef.current || shouldRecenterRef.current || !hasAutoCenteredRef.current;
    if (!canAutoCenter) return;

    mapRef.current?.animateToRegion(regionFromCenter(initialCenter, "close"), 450);
    hasAutoCenteredRef.current = true;
    shouldRecenterRef.current = false;
  }, [initialCenter.lat, initialCenter.lng]);

  function requestRecenter() {
    userInteractedRef.current = false;
    shouldRecenterRef.current = true;
    hasAutoCenteredRef.current = false;
    void refreshLocation({ showError: true, animate: true });
  }

  async function refreshLocation(opts?: { showError?: boolean; animate?: boolean }) {
    const showError = opts?.showError ?? true;
    const animate = opts?.animate ?? true;
    shouldRecenterRef.current = animate;

    const mySeq = ++locationSeqRef.current;
    const showSpinner = !locationReadyRef.current;
    if (showSpinner) setLoadingLocation(true);
    try {
      const ok = await ensureForegroundPermission();
      if (!ok) throw new Error("Necesitás habilitar la ubicación para ver ejecutivos cercanos");

      const fast = await getFastCoords();
      if (mySeq !== locationSeqRef.current) return;

      if (fast) {
        setCenter(fast);
        locationReadyRef.current = true;
        if (showSpinner) setLoadingLocation(false);
      }

      // GPS “real” (con timeout) sin trabar el UI.
      try {
        const current = await getCurrentCoords();
        if (mySeq !== locationSeqRef.current) return;
        setCenter(current);
        setEstimate(null);
        locationReadyRef.current = true;
      } catch {
        // Silencioso: con fast coords ya se puede usar.
      }
    } catch (e) {
      if (showError) {
        setError(e instanceof Error ? e.message : "No se pudo obtener tu ubicación");
      }
    } finally {
      if (showSpinner) setLoadingLocation(false);
    }
  }

  useEffect(() => {
    // Centro instantáneo desde cache (no pide permisos).
    void (async () => {
      const cached = await getLastCoords({ maxAgeMs: 30 * 24 * 60 * 60 * 1000 });
      if (cached) setCenter(cached);
    })();

    const tokenStr = token;
    if (!tokenStr) return;

    setError(null);
    void refreshLocation({ showError: true, animate: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const res = await apiGetPublicZones();
        if (!alive) return;
        setZones(Array.isArray(res.zones) ? res.zones : []);
      } catch {
        // Silencioso: el mapa funciona igual sin overlay.
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    const tokenStr = token;
    const centerVal = center;
    if (!tokenStr || !centerVal) return;

    const mySeq = ++driversSeqRef.current;

    async function refresh(tokenForReq: string, centerForReq: { lat: number; lng: number }, serviceType: ServiceType) {
      try {
        const res = await apiNearbyDrivers(tokenForReq, {
          lat: centerForReq.lat,
          lng: centerForReq.lng,
          radiusM: matchingRadiusM,
          serviceType,
        });
        if (!alive || mySeq !== driversSeqRef.current) return;
        const items = Array.isArray(res.items) ? res.items : [];
        const key = items
          .map((d: any) => {
            const id = d?.driverId != null ? String(d.driverId) : "";
            const updatedAt = d?.location?.updatedAt != null ? String(d.location.updatedAt) : "";
            return `${id}@${updatedAt}`;
          })
          .join("|");
        if (key !== lastDriversKeyRef.current) {
          lastDriversKeyRef.current = key;
          setItems(items);
        }
      } catch {
        // Silencioso: la UI de error la dejamos para el primer load.
      }
    }

    // Primer load con error visible
    (async () => {
      setError(null);
      const showSpinner = !driversLoadedRef.current;
      if (showSpinner) setLoadingDrivers(true);
      try {
        const res = await apiNearbyDrivers(tokenStr, {
          lat: centerVal.lat,
          lng: centerVal.lng,
          radiusM: matchingRadiusM,
          serviceType: wantedType,
        });
        if (!alive || mySeq !== driversSeqRef.current) return;
        const items = Array.isArray(res.items) ? res.items : [];
        const key = items
          .map((d: any) => {
            const id = d?.driverId != null ? String(d.driverId) : "";
            const updatedAt = d?.location?.updatedAt != null ? String(d.location.updatedAt) : "";
            return `${id}@${updatedAt}`;
          })
          .join("|");
        lastDriversKeyRef.current = key;
        setItems(items);
      } catch (e) {
        if (!alive || mySeq !== driversSeqRef.current) return;
        setError(e instanceof Error ? e.message : "No se pudo cargar los ejecutivos");
      } finally {
        if (!alive || mySeq !== driversSeqRef.current) return;
        if (showSpinner) setLoadingDrivers(false);
        driversLoadedRef.current = true;
      }
    })();

    // Polling removido en favor de Sockets (Hito 2)
    return () => {
      alive = false;
    };
  }, [token, center, wantedType, matchingRadiusM]);

  async function onSelectServiceType(next: ServiceType) {
    setWantedType(next);
    setSelected(null);
    setError(null);
    setEstimate(null);
    setEstimateKey(null);
    // Pediste que al tocar cualquiera opción recargue ubicación actual.
    void refreshLocation({ showError: false, animate: false });
  }

  async function ensureAddresses(params: { pickup: { lat: number; lng: number }; dropoff: { lat: number; lng: number } }) {
    // Reverse-geocoding best-effort: si no hay dirección, devolvemos null y NO reusamos valores viejos.
    try {
      const [p, d] = await Promise.all([
        Location.reverseGeocodeAsync({ latitude: params.pickup.lat, longitude: params.pickup.lng }),
        Location.reverseGeocodeAsync({ latitude: params.dropoff.lat, longitude: params.dropoff.lng }),
      ]);

      const pAddr = formatReverseGeocoded(p?.[0]);
      const dAddr = formatReverseGeocoded(d?.[0]);

      setPickupAddress(pAddr ?? null);
      setDropoffAddress(dAddr ?? null);

      return { pickupAddress: pAddr ?? null, dropoffAddress: dAddr ?? null };
    } catch {
      setPickupAddress(null);
      setDropoffAddress(null);
      return { pickupAddress: null, dropoffAddress: null };
    }
  }

  function currentRoutePayload(preferredRoute?: { distanceMeters: number; durationSeconds?: number; routePath: { lat: number; lng: number }[] | null } | null) {
    const previewMatches = routePreviewKey === currentRouteKey;
    const estimateMatches = estimateKey === currentRouteKey;
    const routePath = preferredRoute?.routePath ?? (previewMatches ? routePreview?.routePath : undefined) ?? (estimateMatches ? estimate?.routePath : undefined);
    return {
      distanceMeters: preferredRoute?.distanceMeters ?? (previewMatches ? routePreview?.distanceMeters : undefined) ?? (estimateMatches ? estimate?.distanceMeters : undefined),
      durationSeconds: preferredRoute?.durationSeconds ?? (previewMatches ? routePreview?.durationSeconds : undefined) ?? (estimateMatches ? estimate?.durationSeconds : undefined),
      routePath: Array.isArray(routePath) && routePath.length >= 2 ? downsampleRoutePath(routePath, ROUTE_PAYLOAD_MAX_POINTS) : undefined,
    };
  }

  function applyEstimateResult(res: Awaited<ReturnType<typeof apiEstimateOffer>>) {
    const fallbackRoutePath = routePreviewKey === currentRouteKey ? routePreview?.routePath ?? null : null;
    const resolvedRoutePath = Array.isArray(res.routePath) && res.routePath.length >= 2 ? downsampleRoutePath(res.routePath as any, ROUTE_PAYLOAD_MAX_POINTS) : fallbackRoutePath;

    if (resolvedRoutePath?.length && res.distanceMeters > 0) {
      setRoutePreview({
        distanceMeters: res.distanceMeters,
        durationSeconds: res.durationSeconds,
        routePath: resolvedRoutePath,
      });
      setRoutePreviewKey(currentRouteKey || null);
    }

    setEstimate({
      distanceMeters: res.distanceMeters,
      durationSeconds: res.durationSeconds,
      estimatedPrice: res.estimatedPrice,
      isFixedPrice: Boolean(res.isFixedPrice),
      fixedPriceCop: res.fixedPriceCop ?? null,
      routePath: resolvedRoutePath,
    });
    setCustomFare(Number(res.estimatedPrice));
    setEstimateKey(currentRouteKey || null);
  }

  async function ensureRoutePreview(opts?: { showError?: boolean }) {
    if (!center || !dropoff) return null;
    if (routePreviewKey === currentRouteKey && routePreview?.routePath?.length && routePreview.distanceMeters > 0) return routePreview;
    const showError = opts?.showError ?? true;

    const mySeq = ++routePreviewSeqRef.current;
    setRoutePreviewLoading(true);

    try {
      const route = await getDrivingRoute({ from: center, to: dropoff });
      if (mySeq !== routePreviewSeqRef.current) return null;

      const nextRoute = route
        ? {
            distanceMeters: route.distanceMeters,
            durationSeconds: route.durationSeconds,
            routePath: downsampleRoutePath(route.path.map((p) => ({ lat: p.latitude, lng: p.longitude })), ROUTE_PAYLOAD_MAX_POINTS),
          }
        : null;

      setRoutePreview(nextRoute);
      setRoutePreviewKey(nextRoute ? currentRouteKey : null);
      if (!nextRoute && showError) {
        setError("No se pudo trazar la ruta en este momento. Reintentá.");
      }
      return nextRoute;
    } finally {
      if (mySeq === routePreviewSeqRef.current) setRoutePreviewLoading(false);
    }
  }

  async function requestEstimate(opts?: { showLoading?: boolean; openWhatsappOnNegotiate?: boolean }) {
    if (!token || !center || !dropoff) return null;
    if (estimateInFlightRef.current) return null;

    const mySeq = ++estimateSeqRef.current;
    const showLoading = opts?.showLoading ?? true;
    estimateInFlightRef.current = true;

    if (showLoading) setEstimating(true);
    setError(null);

    try {
      const cachedPayload = currentRoutePayload();
      const ensuredRoute =
        cachedPayload.distanceMeters && cachedPayload.routePath?.length
          ? null
          : await ensureRoutePreview({ showError: false });

      const res = await apiEstimateOffer(token, {
        serviceModeWanted: wantedMode,
        serviceTypeWanted: wantedType,
        pickup: { lat: center.lat, lng: center.lng },
        dropoff: { lat: dropoff.lat, lng: dropoff.lng },
        ...currentRoutePayload(ensuredRoute),
      });
      if (mySeq !== estimateSeqRef.current) return null;

      applyEstimateResult(res);
      return res;
    } catch (e) {
      if (mySeq !== estimateSeqRef.current) return null;
      const hasCurrentEstimate = estimateKey === currentRouteKey && !!estimate;
      if (!hasCurrentEstimate) {
        setEstimate(null);
        setEstimateKey(null);
      }

      if (e instanceof ApiError && e.data?.code === "NEGOTIATE_WHATSAPP") {
        const msg = "Ese recorrido se negocia por WhatsApp.";
        setError(msg);
        if (opts?.openWhatsappOnNegotiate) {
          try {
            await openOperator();
            return null;
          } catch {
            // si falla abrir WhatsApp, dejamos el mensaje visible
          }
        }
        return null;
      }

      if (showLoading || !hasCurrentEstimate) {
        setError(e instanceof Error ? e.message : "No se pudo calcular el aproximado");
      }
      return null;
    } finally {
      estimateInFlightRef.current = false;
      if (showLoading && mySeq === estimateSeqRef.current) setEstimating(false);
    }
  }

  async function estimateApprox() {
    if (!dropoff) {
      setError("Tocá el mapa para elegir el destino");
      return;
    }
    if (estimateInFlightRef.current) return;

    manualEstimateRef.current = true;
    try {
      await requestEstimate({ showLoading: true, openWhatsappOnNegotiate: true });
    } finally {
      manualEstimateRef.current = false;
    }
  }

  async function requestAvailableExecutives() {
    if (!token || !center) return;
    if (requestingRef.current) return;
    if (!dropoff) {
      setError("Tocá el mapa para elegir el destino");
      return;
    }
    if (!estimate || estimateKey !== currentRouteKey) {
      Alert.alert("Falta aproximado", "Primero calculá el aproximado para este destino y tipo de vehículo.");
      return;
    }
    requestingRef.current = true;
    setRequesting(true);
    setError(null);

    try {
      const ensuredRoute = routePreviewKey === currentRouteKey && routePreview?.routePath?.length ? routePreview : await ensureRoutePreview({ showError: false });

      const addr = await ensureAddresses({ pickup: center, dropoff });

      const created = await apiCreateRide(token, {
        serviceModeWanted: wantedMode,
        serviceTypeWanted: wantedType,
        pickup: { lat: center.lat, lng: center.lng, address: addr.pickupAddress ?? undefined },
        dropoff: { lat: dropoff.lat, lng: dropoff.lng, address: addr.dropoffAddress ?? undefined },
        ...currentRoutePayload(ensuredRoute),
        searchRadiusM: matchingRadiusM,
        offeredPrice: customFare ?? undefined,
      });

      await setActiveRideOffersRideId(created.ride.id);

      navigation.replace("PassengerOffersWait", { rideId: created.ride.id });
    } catch (e) {
      if (e instanceof ApiError && e.data?.code === "NEGOTIATE_WHATSAPP") {
        try {
          await openOperator();
          return;
        } catch {
          // fallback a error
        }
      }
      setError(e instanceof Error ? e.message : "No se pudo solicitar el ejecutivo");
    } finally {
      setRequesting(false);
      requestingRef.current = false;
    }
  }

  if (auth.user?.role !== "USER") {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <Card style={{ marginTop: Math.max(insets.top, 16) + 16, marginHorizontal: 16 }}>
          <Text style={{ color: colors.text, fontWeight: "900" }}>Solo disponible para clientes</Text>
        </Card>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.mapWrap}>
        {(() => {
          const rawRoutePath = estimate?.routePath?.length ? estimate.routePath : routePreview?.routePath?.length ? routePreview.routePath : null;

          const routePoints: MapPoint[] | null = rawRoutePath?.length
            ? rawRoutePath
                .map((p) => ({ lat: p.lat, lng: p.lng }))
                .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
            : null;

          const polyline: AppMapPolyline | null = routePoints?.length
            ? {
                id: "estimate-route",
                coordinates: routePoints.map(toLatLng),
                strokeColor: colors.neon,
                strokeWidth: 4,
              }
            : null;

          const markers: AppMapMarker[] = [];
          markers.push({ id: "pickup", title: "A", coordinate: toLatLng(center) });

          const polygons = zones
            .filter((z) => z && z.id && z.geojson)
            .map((z) => ({
              id: z.id,
              geojson: z.geojson,
              // Hub: un poco más marcado
              fillOpacity: z.isHub ? 0.16 : 0.1,
              lineOpacity: z.isHub ? 0.7 : 0.45,
              lineWidth: z.isHub ? 2.5 : 2,
            }));

          if (dropoff) {
            markers.push({
              id: "dropoff",
              title: "B",
              coordinate: toLatLng(dropoff),
              draggable: true,
              onDragEnd: (c: any) => {
                setDropoff({ lat: c.latitude, lng: c.longitude });
                setDropoffAddress(null);
                setRoutePreview(null);
                setRoutePreviewKey(null);
                setEstimate(null);
                setEstimateKey(null);
                setCustomFare(null);
                setError(null);
              },
            });
          }

          for (const d of items.filter((x) => !!x.location)) {
            const loc = d.location!;
            const lat = Number(loc.lat);
            const lng = Number(loc.lng);
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
            markers.push({
              id: `driver-${String(d.driverId)}`,
              coordinate: toLatLng({ lat, lng }),
              pinColor: colors.danger,
              onPress: () => setSelected(d),
            });
          }

          return (
            <AppMap
              ref={(r) => {
                mapRef.current = r;
              }}
              style={StyleSheet.absoluteFill}
              initialRegion={regionFromCenter(initialCenter, "close")}
              rotateEnabled
              pitchEnabled={false}
              scrollEnabled
              zoomEnabled
              polygons={polygons}
              onMapReady={() => {
                mapReadyRef.current = true;
                const canAutoCenter = !userInteractedRef.current || shouldRecenterRef.current || !hasAutoCenteredRef.current;
                if (!canAutoCenter) return;
                mapRef.current?.animateToRegion(regionFromCenter(initialCenter, "close"), 0);
                hasAutoCenteredRef.current = true;
                shouldRecenterRef.current = false;
              }}
              onUserGesture={() => {
                userInteractedRef.current = true;
              }}
              onPress={(c) => {
                setDropoff({ lat: c.latitude, lng: c.longitude });
                setDropoffAddress(null);
                setRoutePreview(null);
                setRoutePreviewKey(null);
                setEstimate(null);
                setEstimateKey(null);
                setError(null);
              }}
              polyline={polyline}
              markers={markers}
            />
          );
        })()}

        {/* Floating Back Button */}
        <View style={[styles.floatingTopLeft, { top: Math.max(insets.top, 16) }]}>
          <Pressable style={styles.fabBtnBack} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={26} color={colors.neon} />
          </Pressable>
        </View>

        {/* Floating Locate & Support Buttons */}
        <View style={[styles.floatingSideButtons, { top: Math.max(insets.top, 16) }]}>
          <Pressable style={styles.fabBtnSupport} onPress={() => void openOperator()}>
            <Ionicons name="logo-whatsapp" size={28} color="#25D366" />
          </Pressable>
          <Pressable style={styles.fabBtn} onPress={requestRecenter}>
            <Ionicons name="locate" size={22} color={colors.neon} />
          </Pressable>
        </View>

        {loadingLocation || (loadingDrivers && !driversLoadedRef.current) ? (
          <View style={[styles.loadingOverlay, { top: Math.max(insets.top, 16) + 130, left: 16 }]}>
            <ActivityIndicator color={colors.neon} />
            <Text style={styles.loadingText}>{loadingLocation ? "Ubicando..." : "Buscando..."}</Text>
          </View>
        ) : null}

        {!!error ? (
          <View style={[styles.errorOverlay, { top: Math.max(insets.top, 16) + 130, left: 16 }]}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Unified Bottom Sheet */}
        <View style={[styles.unifiedBottomSheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.serviceTypesScroll}>
            {(["CARRO", "MOTO", "MOTO_CARGA", "CARRO_CARGA"] as ServiceType[]).map((t) => {
              const active = wantedType === t;
              return (
                <Pressable
                  key={t}
                  style={[styles.serviceTypeCard, active && styles.serviceTypeCardActive]}
                  onPress={() => void onSelectServiceType(t)}
                >
                  <View style={[styles.serviceIconCircle, active && { backgroundColor: colors.neonGlow }]}>
                    <Ionicons 
                      name={serviceTypeIconName(t)} 
                      size={24} 
                      color={active ? colors.neon : "#888"} 
                    />
                  </View>
                  <Text style={[styles.serviceTypeText, active && { color: colors.neon, fontWeight: "bold" }]}>
                    {serviceTypeLabel(t)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {estimate ? (
            <View style={styles.estimateContainer}>
              <View style={styles.estimateDetails}>
                <Text style={styles.estimateLabel}>OFERTA SUGERIDA</Text>
                {customFare !== null ? (
                  <View style={styles.fareAdjustRow}>
                    <Pressable style={styles.fareAdjustBtn} onPress={() => setCustomFare(f => Math.max(0, (f ?? 0) - 500))}>
                      <Ionicons name="remove" size={20} color="#fff" />
                    </Pressable>
                    <Text style={styles.estimatePrice}>{formatCop(customFare)}</Text>
                    <Pressable style={styles.fareAdjustBtn} onPress={() => setCustomFare(f => (f ?? 0) + 500)}>
                      <Ionicons name="add" size={20} color="#fff" />
                    </Pressable>
                  </View>
                ) : (
                  <Text style={styles.estimatePrice}>{formatCop(Number(estimate.estimatedPrice))}</Text>
                )}
                {(() => {
                  const secondary = formatSecondaryFromCop(customFare ?? Number(estimate.estimatedPrice), auth.appConfig ?? {});
                  return secondary ? <Text style={styles.estimateSecondary}>{secondary}</Text> : null;
                })()}
              </View>
              <View style={styles.estimateMeta}>
                <Text style={styles.estimateDistance}>{Math.round(estimate.distanceMeters / 100) / 10} km</Text>
                <Text style={styles.estimateTime}>{estimate.durationSeconds ? Math.ceil(estimate.durationSeconds / 60) + ' min' : ''}</Text>
              </View>
            </View>
          ) : (
            <Pressable style={styles.calcBtn} onPress={() => void estimateApprox()} disabled={estimating || loadingLocation || estimateInFlightRef.current}>
              <Ionicons name="calculator" size={20} color={colors.neon} />
              <Text style={styles.calcBtnText}>{estimating ? "Calculando..." : "Calcular precio"}</Text>
            </Pressable>
          )}

          <Pressable 
            style={[styles.requestActionBtn, (!dropoff || requesting) && { opacity: 0.5 }]} 
            onPress={() => void requestAvailableExecutives()} 
            disabled={requesting || loadingLocation || !dropoff}
          >
            <LinearGradient colors={["#D4AF37", "#997A15"]} style={styles.requestActionGradient}>
              <Text style={[styles.requestActionText, { color: "#000" }]}>{requesting ? "Solicitando..." : "Confirmar viaje"}</Text>
              <Ionicons name="arrow-forward" size={20} color="#000" />
            </LinearGradient>
          </Pressable>
        </View>

        {selected ? (
          <View style={[styles.sheet, { bottom: Math.max(insets.bottom, 16) }]}>
            <Card style={{ gap: 10 }}>
              <View style={styles.sheetTitleRow}>
                <Ionicons name={serviceTypeIconName(selected.serviceType)} size={18} color={colors.neon} />
                <Text style={styles.sheetTitle}>{selected.fullName}</Text>
              </View>

              {selected.photoUrl ? (
                <View style={styles.photoRow}>
                  <Image source={{ uri: absoluteUrl(selected.photoUrl) ?? undefined }} style={styles.photo} resizeMode="cover" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sheetLine}>Servicio: {serviceTypeLabel(selected.serviceType)}</Text>
                    <Text style={styles.sheetLine}>Distancia: {Math.round(selected.distanceMeters)} m</Text>
                  </View>
                </View>
              ) : (
                <>
                  <Text style={styles.sheetLine}>Servicio: {serviceTypeLabel(selected.serviceType)}</Text>
                  <Text style={styles.sheetLine}>Distancia: {Math.round(selected.distanceMeters)} m</Text>
                </>
              )}
              {selected.location ? <Text style={styles.sheetLine}>Última actualización: {formatAgo(selected.location.updatedAt)}</Text> : null}

              {selected.vehicle ? (
                <Text style={styles.sheetLine}>
                  Vehículo: {selected.vehicle.brand} {selected.vehicle.model} {selected.vehicle.year} • {selected.vehicle.color}
                </Text>
              ) : (
                <Text style={styles.sheetLine}>Vehículo: (sin datos)</Text>
              )}

              <SecondaryButton label="Cerrar" onPress={() => setSelected(null)} disabled={requesting} />
            </Card>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topSearchCard: {
    position: "absolute",
    left: 16,
    right: 16,
    backgroundColor: "rgba(10, 15, 25, 0.9)",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 10,
  },
  searchInner: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  searchDotContainer: {
    alignItems: "center",
    marginRight: 12,
    paddingVertical: 8,
  },
  dotGreen: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#4CAF50",
  },
  dotLine: {
    flex: 1,
    width: 2,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginVertical: 4,
  },
  dotRed: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#F44336",
  },
  searchTexts: {
    flex: 1,
  },
  searchRow: {
    paddingVertical: 12,
  },
  searchDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  searchPlaceholder: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "500",
  },
  floatingTopLeft: {
    position: "absolute",
    left: 16,
    zIndex: 9,
  },
  fabBtnBack: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(10, 15, 25, 0.9)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  floatingSideButtons: {
    position: "absolute",
    right: 16,
    alignItems: "center",
    gap: 16,
    zIndex: 9,
  },
  fabBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "rgba(10, 15, 25, 0.9)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  fabBtnSupport: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#382D00",
    borderWidth: 2,
    borderColor: colors.neon,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.neon,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  unifiedBottomSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(12, 12, 10, 0.95)",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    paddingTop: 24,
    paddingHorizontal: 16,
    zIndex: 20,
    shadowColor: "#000",
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 20,
  },
  serviceTypesScroll: {
    gap: 12,
    paddingRight: 16,
    marginBottom: 20,
  },
  serviceTypeCard: {
    width: 65,
    height: 70,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.02)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  serviceTypeCardActive: {
    backgroundColor: colors.neonGlow,
    borderColor: colors.neon,
  },
  serviceIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  serviceTypeText: {
    color: "#888",
    fontSize: 9,
    fontWeight: "600",
  },
  calcBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    marginBottom: 16,
    gap: 8,
  },
  calcBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  estimateContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.05)",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    marginBottom: 16,
  },
  estimateDetails: {
    flex: 1,
  },
  estimateLabel: {
    color: "#888",
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 1,
    marginBottom: 4,
  },
  estimatePrice: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "900",
  },
  estimateSecondary: {
    color: "#4CAF50",
    fontSize: 12,
    marginTop: 2,
  },
  fareAdjustRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  fareAdjustBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  estimateMeta: {
    alignItems: "flex-end",
  },
  estimateDistance: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  estimateTime: {
    color: "#888",
    fontSize: 12,
    marginTop: 2,
  },
  requestActionBtn: {
    borderRadius: 16,
    overflow: "hidden",
  },
  requestActionGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
  },
  requestActionText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  pressed: {
    opacity: 0.85,
  },
  mapWrap: {
    flex: 1,
    position: "relative",
  },
  loadingOverlay: {
    position: "absolute",
    backgroundColor: "rgba(10, 15, 25, 0.9)",
    borderColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    zIndex: 10,
  },
  loadingText: {
    color: "#aaa",
    fontWeight: "700",
  },
  destMarkerWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  destMarkerInner: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.text,
    borderWidth: 2,
    borderColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  errorOverlay: {
    position: "absolute",
    backgroundColor: "rgba(10, 15, 25, 0.9)",
    borderColor: colors.danger,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    zIndex: 10,
  },
  errorText: {
    color: colors.danger,
    fontWeight: "800",
  },
  sheet: {
    position: "absolute",
    bottom: 16,
    left: 16,
    right: 16,
    zIndex: 20,
  },
  sheetTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sheetTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "900",
  },
  sheetLine: {
    color: colors.mutedText,
    fontSize: 13,
    lineHeight: 18,
  },
  photoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  photo: {
    width: 60,
    height: 60,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
});
