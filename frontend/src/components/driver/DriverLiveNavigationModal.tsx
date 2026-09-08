import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { AppMap, type AppMapMarker, type AppMapPolyline, type AppMapRef, type LatLng } from "../AppMap";
import { MapPointMarker } from "../map/MapPointMarker";
import { colors } from "../../theme/colors";
import { formatCop } from "../../utils/currency";
import { getDrivingRoute } from "../../utils/directions";
import { openPhoneCall, openWhatsappMessage } from "../../utils/phone";
import { absoluteUrl } from "../../utils/url";
import { useSocket } from "../../realtime/SocketProvider";
import { useAuth } from "../../auth/AuthContext";
import { apiDriverUpsertLocation } from "../../driver/driver.api";
import * as Location from "expo-location";

export interface DriverLiveNavigationModalProps {
  visible: boolean;
  ride: any;
  onClose: () => void;
  onNotifyArrived?: () => void;
  onDriverAction?: (action: "accept" | "start" | "complete") => void;
  onNavigateChat?: (rideId: string) => void;
  rideActionLoading?: boolean;
}

function formatMetersToDisplay(meters: number): string {
  if (!Number.isFinite(meters) || meters <= 0) return "--";
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function formatSecondsToDisplay(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "--";
  const mins = Math.ceil(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  return `${hrs} h ${remMins} m`;
}

export function DriverLiveNavigationModal({
  visible,
  ride,
  onClose,
  onNotifyArrived,
  onDriverAction,
  onNavigateChat,
  rideActionLoading,
}: DriverLiveNavigationModalProps) {
  const insets = useSafeAreaInsets();
  const { socket } = useSocket();
  const auth = useAuth();
  const mapRef = useRef<AppMapRef | null>(null);

  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [heading, setHeading] = useState<number>(0);
  const [routePath, setRoutePath] = useState<{ latitude: number; longitude: number }[]>([]);
  const [distanceMeters, setDistanceMeters] = useState<number>(0);
  const [durationSeconds, setDurationSeconds] = useState<number>(0);
  const [loadingRoute, setLoadingRoute] = useState<boolean>(false);
  const [followDriver, setFollowDriver] = useState<boolean>(true);

  const lastRouteCalcPosRef = useRef<{ lat: number; lng: number } | null>(null);
  const lastRestSyncAtRef = useRef<number>(0);

  // Determinar fase actual
  const status = ride?.status || "ASSIGNED";
  const isTripInProgress = status === "IN_PROGRESS";
  const hasArrivedAtPickup = status === "ARRIVED";

  // Destino actual según la fase:
  // - Si aún no está en curso -> ir al Punto A (Recogida del cliente)
  // - Si ya está en curso -> ir al Punto B (Destino final)
  const targetLat = isTripInProgress ? Number(ride?.dropoffLat) : Number(ride?.pickupLat);
  const targetLng = isTripInProgress ? Number(ride?.dropoffLng) : Number(ride?.pickupLng);
  const targetAddress = isTripInProgress
    ? (ride?.dropoffText || ride?.dropoffAddress || "Destino final")
    : (ride?.pickupText || ride?.pickupAddress || "Punto de recogida del cliente");
  const targetPointType: "A" | "B" = isTripInProgress ? "B" : "A";
  const targetTag = isTripInProgress ? "DESTINO" : "CLIENTE";

  const passengerName =
    ride?.passenger?.fullName ||
    `${ride?.passenger?.firstName || ""} ${ride?.passenger?.lastName || ""}`.trim() ||
    "Cliente";
  const passengerPhone = ride?.passenger?.phone;
  const passengerPhoto = absoluteUrl(ride?.passenger?.photoUrl);
  const rawPrice = ride?.agreedPrice || ride?.estimatedPrice || 0;
  const priceDisplay = formatCop(Number(rawPrice));

  // 1. Obtener ubicación inicial y rastrear posición en tiempo real
  useEffect(() => {
    if (!visible) return;

    let subscriber: Location.LocationSubscription | null = null;
    let isCancelled = false;

    async function startLiveTracking() {
      try {
        const { status: permStatus } = await Location.requestForegroundPermissionsAsync();
        if (permStatus !== "granted") {
          Alert.alert("Permiso requerido", "Se requiere permiso de ubicación para la navegación en vivo.");
          return;
        }

        // Posición rápida inicial
        const initialPos = await Location.getLastKnownPositionAsync();
        if (initialPos && !isCancelled) {
          const lat = initialPos.coords.latitude;
          const lng = initialPos.coords.longitude;
          setDriverLocation({ lat, lng });
          if (initialPos.coords.heading && initialPos.coords.heading >= 0) {
            setHeading(initialPos.coords.heading);
          }
        }

        // Suscribir GPS continuo para navegación precisa
        subscriber = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.BestForNavigation,
            timeInterval: 2000,
            distanceInterval: 4,
          },
          (loc) => {
            if (isCancelled) return;
            const lat = loc.coords.latitude;
            const lng = loc.coords.longitude;
            setDriverLocation({ lat, lng });

            if (loc.coords.heading && loc.coords.heading >= 0) {
              setHeading(loc.coords.heading);
            }

            // Emisión instantánea por Socket para que el cliente lo vea en su mapa
            if (socket?.connected) {
              socket.emit("driver:location", { lat, lng });
            }

            // Sincronización REST con backend (cada 10s máximo)
            const now = Date.now();
            if (auth.token && now - lastRestSyncAtRef.current > 10000) {
              lastRestSyncAtRef.current = now;
              apiDriverUpsertLocation(auth.token, { lat, lng }).catch(() => {});
            }

            // Centrar cámara si el chofer tiene activo el seguimiento automático
            if (followDriver && mapRef.current) {
              mapRef.current.animateToRegion(
                {
                  latitude: lat,
                  longitude: lng,
                  latitudeDelta: 0.008,
                  longitudeDelta: 0.008,
                },
                500
              );
            }
          }
        );
      } catch (err) {
        console.warn("[DriverNav] Error al iniciar seguimiento GPS:", err);
      }
    }

    void startLiveTracking();

    return () => {
      isCancelled = true;
      if (subscriber) subscriber.remove();
    };
  }, [visible, followDriver, socket, auth.token]);

  // 2. Calcular ruta dinámica en tiempo real entre chofer y punto objetivo
  useEffect(() => {
    if (!visible || !driverLocation) return;
    if (!Number.isFinite(targetLat) || !Number.isFinite(targetLng) || targetLat === 0) return;

    // Evitar re-calcular ruta si el chofer se ha movido menos de 25 metros
    if (lastRouteCalcPosRef.current) {
      const dLat = Math.abs(driverLocation.lat - lastRouteCalcPosRef.current.lat);
      const dLng = Math.abs(driverLocation.lng - lastRouteCalcPosRef.current.lng);
      if (dLat < 0.00025 && dLng < 0.00025 && routePath.length > 0) {
        return;
      }
    }

    let isMounted = true;

    async function updateDynamicRoute() {
      if (!driverLocation) return;
      setLoadingRoute(true);
      try {
        const routeResult = await getDrivingRoute({
          from: { lat: driverLocation.lat, lng: driverLocation.lng },
          to: { lat: targetLat, lng: targetLng },
        });

        if (isMounted && routeResult) {
          lastRouteCalcPosRef.current = { lat: driverLocation.lat, lng: driverLocation.lng };
          setRoutePath(routeResult.path);
          setDistanceMeters(routeResult.distanceMeters);
          setDurationSeconds(routeResult.durationSeconds);
        }
      } catch {
        // Silencioso
      } finally {
        if (isMounted) setLoadingRoute(false);
      }
    }

    void updateDynamicRoute();

    return () => {
      isMounted = false;
    };
  }, [visible, driverLocation, targetLat, targetLng]);

  // Re-centrar vista mostrando tanto el chofer como el objetivo
  function handleRecenterRoute() {
    setFollowDriver(false);
    if (!mapRef.current || !driverLocation) return;

    mapRef.current.fitToCoordinates(
      [
        { latitude: driverLocation.lat, longitude: driverLocation.lng },
        { latitude: targetLat, longitude: targetLng },
      ],
      {
        edgePadding: { top: 120, right: 40, bottom: 240, left: 40 },
        animated: true,
      }
    );
  }

  // Centrar exclusivamente en el vehículo
  function handleCenterOnMe() {
    setFollowDriver(true);
    if (!mapRef.current || !driverLocation) return;

    mapRef.current.animateToRegion(
      {
        latitude: driverLocation.lat,
        longitude: driverLocation.lng,
        latitudeDelta: 0.006,
        longitudeDelta: 0.006,
      },
      600
    );
  }

  if (!visible || !ride) return null;

  // Marcadores en vivo
  const markers: AppMapMarker[] = [];

  // Marcador del vehículo del chofer
  if (driverLocation) {
    markers.push({
      id: "driver-me",
      coordinate: { latitude: driverLocation.lat, longitude: driverLocation.lng },
      children: (
        <MapPointMarker
          type="DRIVER"
          bearing={heading}
          vehicleType={ride?.serviceTypeWanted || "CARRO"}
          pinColor="#0000FF"
        />
      ),
    });
  }

  // Marcador del objetivo (Punto A o Punto B)
  if (Number.isFinite(targetLat) && Number.isFinite(targetLng) && targetLat !== 0) {
    markers.push({
      id: "nav-target",
      coordinate: { latitude: targetLat, longitude: targetLng },
      children: (
        <MapPointMarker
          type={targetPointType}
          label={targetPointType}
          tag={targetTag}
          pinColor={targetPointType === "A" ? "#0000FF" : "#FF3344"}
        />
      ),
    });
  }

  // Polilínea dinámica
  const polyline: AppMapPolyline | null =
    routePath.length > 0
      ? {
          id: "driver-nav-route",
          coordinates: routePath,
          strokeColor: "#0000FF",
          strokeWidth: 5,
        }
      : null;

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Mapa de Navegación Mapbox a Pantalla Completa */}
        <AppMap
          ref={(r) => {
            mapRef.current = r;
          }}
          style={StyleSheet.absoluteFill}
          initialRegion={{
            latitude: driverLocation?.lat || targetLat || 7.7669,
            longitude: driverLocation?.lng || targetLng || -72.225,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
          interactive
          rotateEnabled
          pitchEnabled
          scrollEnabled
          zoomEnabled
          polyline={polyline}
          markers={markers}
          onUserGesture={() => {
            setFollowDriver(false);
          }}
        />

        {/* HUD SUPERIOR: Instrucciones y Dirección de Ruta */}
        <View style={[styles.topHud, { paddingTop: Math.max(insets.top, 16) }]}>
          <View style={styles.topHudCard}>
            <View style={styles.topHudRow}>
              <View style={[styles.phaseIndicator, { backgroundColor: targetPointType === "A" ? "#0000FF" : "#FF3344" }]}>
                <Ionicons name={isTripInProgress ? "flag" : "navigate"} size={20} color="#FFFFFF" />
              </View>
              <View style={styles.targetAddressWrap}>
                <Text style={styles.targetPhaseTitle}>
                  {isTripInProgress
                    ? "RUMBO AL DESTINO (PUNTO B)"
                    : hasArrivedAtPickup
                    ? "EN EL SITIO DE RECOGIDA"
                    : "EN CAMINO AL CLIENTE (PUNTO A)"}
                </Text>
                <Text style={styles.targetAddressText} numberOfLines={2}>
                  {targetAddress}
                </Text>
              </View>
              <Pressable style={styles.closeBtn} onPress={onClose}>
                <Ionicons name="close" size={22} color="#FFFFFF" />
              </Pressable>
            </View>

            {/* Métricas de Distancia y Tiempo */}
            <View style={styles.metricsRow}>
              <View style={styles.metricItem}>
                <Ionicons name="speedometer-outline" size={16} color="#66B2FF" />
                <Text style={styles.metricLabel}>DISTANCIA:</Text>
                <Text style={styles.metricValue}>{formatMetersToDisplay(distanceMeters)}</Text>
              </View>
              <View style={styles.metricDivider} />
              <View style={styles.metricItem}>
                <Ionicons name="time-outline" size={16} color="#66B2FF" />
                <Text style={styles.metricLabel}>TIEMPO APROX:</Text>
                <Text style={styles.metricValue}>
                  {loadingRoute ? "..." : formatSecondsToDisplay(durationSeconds)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* BOTONES LATERALES FLOTANTES */}
        <View style={styles.sideControls}>
          <Pressable
            style={[styles.sideBtn, followDriver && styles.sideBtnActive]}
            onPress={handleCenterOnMe}
            accessibilityLabel="Centrar en vehículo"
          >
            <Ionicons name="locate" size={22} color={followDriver ? "#0000FF" : "#FFFFFF"} />
          </Pressable>

          <Pressable
            style={styles.sideBtn}
            onPress={handleRecenterRoute}
            accessibilityLabel="Ver ruta completa"
          >
            <Ionicons name="map-outline" size={22} color="#FFFFFF" />
          </Pressable>

          {passengerPhone ? (
            <>
              <Pressable
                style={[styles.sideBtn, styles.phoneBtn]}
                onPress={() => openPhoneCall(passengerPhone)}
                accessibilityLabel="Llamar cliente"
              >
                <Ionicons name="call" size={20} color="#FFFFFF" />
              </Pressable>
              <Pressable
                style={[styles.sideBtn, styles.whatsappBtn]}
                onPress={() => openWhatsappMessage(passengerPhone)}
                accessibilityLabel="WhatsApp cliente"
              >
                <Ionicons name="logo-whatsapp" size={22} color="#FFFFFF" />
              </Pressable>
            </>
          ) : null}

          {onNavigateChat ? (
            <Pressable
              style={styles.sideBtn}
              onPress={() => onNavigateChat(String(ride.id))}
              accessibilityLabel="Chat con cliente"
            >
              <Ionicons name="chatbubble-ellipses" size={20} color="#0000FF" />
            </Pressable>
          ) : null}
        </View>

        {/* HUD INFERIOR: Ficha del Pasajero y Acción de Navegación de 1 Clic */}
        <View style={[styles.bottomHud, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.passengerRow}>
            {passengerPhoto ? (
              <Image source={{ uri: passengerPhoto }} style={styles.avatar} resizeMode="cover" />
            ) : (
              <View style={styles.avatarFallback}>
                <Ionicons name="person" size={20} color="#0000FF" />
              </View>
            )}
            <View style={styles.passengerInfo}>
              <Text style={styles.passengerName} numberOfLines={1}>
                {passengerName}
              </Text>
              <Text style={styles.serviceModeBadge}>
                {ride?.serviceTypeWanted || "SERVICIO XPRESS"}
              </Text>
            </View>
            <View style={styles.priceBadge}>
              <Text style={styles.priceText}>{priceDisplay}</Text>
            </View>
          </View>

          {/* BOTÓN PRINCIPAL DE ACCIÓN DE FLUJO */}
          <View style={styles.actionWrap}>
            {!isTripInProgress && !hasArrivedAtPickup && onNotifyArrived ? (
              <Pressable
                style={[styles.actionBtn, styles.arrivedBtn]}
                onPress={onNotifyArrived}
                disabled={rideActionLoading}
              >
                {rideActionLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="location" size={22} color="#FFFFFF" />
                    <Text style={styles.actionBtnText}>¡Llegué al Punto de Recogida!</Text>
                  </>
                )}
              </Pressable>
            ) : null}

            {!isTripInProgress && (hasArrivedAtPickup || !onNotifyArrived) && onDriverAction ? (
              <Pressable
                style={[styles.actionBtn, styles.startBtn]}
                onPress={() => onDriverAction("start")}
                disabled={rideActionLoading}
              >
                {rideActionLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="play" size={22} color="#FFFFFF" />
                    <Text style={styles.actionBtnText}>Iniciar Carrera hacia Destino</Text>
                  </>
                )}
              </Pressable>
            ) : null}

            {isTripInProgress && onDriverAction ? (
              <Pressable
                style={[styles.actionBtn, styles.completeBtn]}
                onPress={() => {
                  Alert.alert(
                    "Finalizar Carrera",
                    "¿Llegaste al destino y deseas concluir el servicio?",
                    [
                      { text: "Cancelar", style: "cancel" },
                      {
                        text: "Finalizar Servicio",
                        style: "destructive",
                        onPress: () => onDriverAction("complete"),
                      },
                    ]
                  );
                }}
                disabled={rideActionLoading}
              >
                {rideActionLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
                    <Text style={styles.actionBtnText}>Finalizar Servicio</Text>
                  </>
                )}
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  topHud: {
    position: "absolute",
    top: 0,
    left: 16,
    right: 16,
    zIndex: 90,
  },
  topHudCard: {
    backgroundColor: "rgba(10, 10, 16, 0.95)",
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "rgba(0, 0, 255, 0.35)",
    padding: 14,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.9,
    shadowRadius: 12,
    elevation: 10,
  },
  topHudRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  phaseIndicator: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0000FF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 6,
  },
  targetAddressWrap: {
    flex: 1,
  },
  targetPhaseTitle: {
    color: "#66B2FF",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  targetAddressText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 17,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  metricsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
  },
  metricItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metricLabel: {
    color: "#8E8E93",
    fontSize: 10,
    fontWeight: "800",
  },
  metricValue: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
  metricDivider: {
    width: 1,
    height: 16,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
  },
  sideControls: {
    position: "absolute",
    right: 16,
    top: 200,
    gap: 12,
    zIndex: 90,
  },
  sideBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(10, 10, 16, 0.92)",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 6,
  },
  sideBtnActive: {
    borderColor: "#0000FF",
    backgroundColor: "rgba(0, 0, 255, 0.15)",
  },
  phoneBtn: {
    backgroundColor: "#007AFF",
    borderColor: "#66B2FF",
  },
  whatsappBtn: {
    backgroundColor: "#25D366",
    borderColor: "#4CE585",
  },
  bottomHud: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(10, 10, 16, 0.96)",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    paddingTop: 18,
    paddingHorizontal: 20,
    zIndex: 90,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.9,
    shadowRadius: 15,
    elevation: 20,
  },
  passengerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: "#0000FF",
  },
  avatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(0, 0, 255, 0.15)",
    borderWidth: 1.5,
    borderColor: "#0000FF",
    alignItems: "center",
    justifyContent: "center",
  },
  passengerInfo: {
    flex: 1,
  },
  passengerName: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 2,
  },
  serviceModeBadge: {
    color: colors.mutedText,
    fontSize: 11,
    fontWeight: "700",
  },
  priceBadge: {
    backgroundColor: "rgba(0, 0, 255, 0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#0000FF",
  },
  priceText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },
  actionWrap: {
    marginTop: 4,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 18,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 8,
  },
  arrivedBtn: {
    backgroundColor: "#0000FF",
  },
  startBtn: {
    backgroundColor: "#008844",
  },
  completeBtn: {
    backgroundColor: "#CC0022",
  },
  actionBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
});
