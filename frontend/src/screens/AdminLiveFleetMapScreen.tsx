import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AppMap, type AppMapMarker, type AppMapRef, type LatLng, type Region } from "../components/AppMap";
import type { RootStackParamList } from "../navigation/AppNavigator";
import { colors } from "../theme/colors";
import { useAuth } from "../auth/AuthContext";
import { useSocket } from "../realtime/SocketProvider";
import { apiAdminAssignRideDriver, apiAdminGetLiveFleet } from "../admin/admin.api";
import { serviceTypeLabel } from "../utils/serviceType";
import { formatCop } from "../utils/currency";
import { absoluteUrl } from "../utils/url";
import { buildWhatsappLink } from "../utils/whatsapp";

type Props = NativeStackScreenProps<RootStackParamList, "AdminLiveFleetMap">;

type LiveDriver = {
  id: string;
  userId: string;
  fullName: string;
  phone: string;
  photoUrl?: string;
  serviceType: "CARRO" | "MOTO" | string;
  status: string;
  isAvailable: boolean;
  avgRating?: number;
  ratingsCount?: number;
  completedRidesCount?: number;
  vehicle?: {
    brand?: string;
    model?: string;
    plate?: string;
    color?: string;
  };
  location?: {
    lat: number;
    lng: number;
    updatedAt?: string;
  };
  bearing?: number;
  speed?: number;
  isMoving?: boolean;
  lastMovedAt?: number;
};

type PendingRide = {
  id: string;
  status: string;
  serviceTypeWanted: string;
  pickupLat: number;
  pickupLng: number;
  pickupAddress: string;
  dropoffLat: number;
  dropoffLng: number;
  dropoffAddress: string;
  distanceMeters?: number;
  estimatedPrice?: number;
  agreedPrice?: number;
  createdAt: string;
  passenger?: {
    id: string;
    fullName: string;
    phone: string;
    photoUrl?: string;
  };
};

const INITIAL_CENTER = { latitude: 7.7669, longitude: -72.225 }; // San Cristóbal, Táchira

function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos((lat2 * Math.PI) / 180);
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.cos(dLon);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return Math.round((brng + 360) % 360);
}

function bearingToCardinal(deg: number): string {
  const directions = ["Norte (N)", "Noreste (NE)", "Este (E)", "Sureste (SE)", "Sur (S)", "Suroeste (SO)", "Oeste (O)", "Noroeste (NO)"];
  const index = Math.round(deg / 45) % 8;
  return directions[index];
}

export function AdminLiveFleetMapScreen({ navigation }: Props) {
  const auth = useAuth();
  const token = auth.token;
  const { socket } = useSocket();

  const [drivers, setDrivers] = useState<LiveDriver[]>([]);
  const [pendingRides, setPendingRides] = useState<PendingRide[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedDriver, setSelectedDriver] = useState<LiveDriver | null>(null);
  const [followDriverId, setFollowDriverId] = useState<string | null>(null);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [assigningRideId, setAssigningRideId] = useState<string | null>(null);

  const selectedDriverRef = useRef<LiveDriver | null>(null);
  selectedDriverRef.current = selectedDriver;

  const followDriverIdRef = useRef<string | null>(null);
  followDriverIdRef.current = followDriverId;

  const mapRef = useRef<AppMapRef | null>(null);

  const fetchFleet = useCallback(async (isSilent = false) => {
    if (!token) return;
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const res = await apiAdminGetLiveFleet(token);
      if (res.ok) {
        setDrivers((prev) => {
          const prevMap = new Map(prev.map((d) => [d.id, d]));
          return (res.drivers || []).map((newD: any) => {
            const old = prevMap.get(newD.id);
            return {
              ...newD,
              bearing: old?.bearing ?? newD.bearing,
              speed: old?.speed ?? newD.speed,
              isMoving: old?.isMoving ?? false,
              lastMovedAt: old?.lastMovedAt,
            };
          });
        });
        setPendingRides(res.pendingRides || []);
      }
    } catch (e) {
      if (!isSilent) {
        setError(e instanceof Error ? e.message : "No se pudo cargar la flota");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    void fetchFleet(false);
    const interval = setInterval(() => {
      void fetchFleet(true);
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchFleet]);

  // Escuchar eventos de actualización de ubicación en tiempo real vía WebSockets
  useEffect(() => {
    if (!socket) return;

    const handleLocationUpdate = (payload: {
      driverId: string;
      lat: number;
      lng: number;
      heading?: number;
      speed?: number;
      updatedAt?: string;
    }) => {
      if (!payload?.driverId || payload.lat == null || payload.lng == null) return;
      const now = Date.now();

      setDrivers((prev) =>
        prev.map((d) => {
          if (d.id === payload.driverId) {
            const prevLat = Number(d.location?.lat);
            const prevLng = Number(d.location?.lng);
            let calculatedBearing = d.bearing;

            if (typeof payload.heading === "number" && payload.heading >= 0) {
              calculatedBearing = Math.round(payload.heading);
            } else if (Number.isFinite(prevLat) && Number.isFinite(prevLng)) {
              const dLat = Math.abs(payload.lat - prevLat);
              const dLng = Math.abs(payload.lng - prevLng);
              if (dLat > 0.00003 || dLng > 0.00003) {
                calculatedBearing = calculateBearing(prevLat, prevLng, payload.lat, payload.lng);
              }
            }

            const updatedLocation = {
              lat: payload.lat,
              lng: payload.lng,
              updatedAt: payload.updatedAt ?? new Date().toISOString(),
            };

            const updatedDriver: LiveDriver = {
              ...d,
              location: updatedLocation,
              bearing: calculatedBearing,
              speed: payload.speed ?? d.speed,
              isMoving: true,
              lastMovedAt: now,
            };

            // Si es el conductor seleccionado, actualizamos la ficha en tiempo real
            if (selectedDriverRef.current?.id === d.id) {
              setSelectedDriver(updatedDriver);

              // Si tiene el modo seguimiento activado, la cámara se desplaza suavemente con él
              if (followDriverIdRef.current === d.id) {
                mapRef.current?.animateToRegion(
                  {
                    latitude: payload.lat,
                    longitude: payload.lng,
                    latitudeDelta: 0.012,
                    longitudeDelta: 0.012,
                  },
                  400
                );
              }
            }

            return updatedDriver;
          }
          return d;
        })
      );
    };

    const handleAvailabilityUpdate = (payload: { driverId: string; isAvailable: boolean }) => {
      if (!payload?.driverId) return;
      setDrivers((prev) =>
        prev.map((d) => (d.id === payload.driverId ? { ...d, isAvailable: payload.isAvailable } : d))
      );
      if (selectedDriverRef.current?.id === payload.driverId) {
        setSelectedDriver((cur) => (cur ? { ...cur, isAvailable: payload.isAvailable } : null));
      }
    };

    socket.on("driver_location_update", handleLocationUpdate);
    socket.on("driver_availability_update", handleAvailabilityUpdate);

    return () => {
      socket.off("driver_location_update", handleLocationUpdate);
      socket.off("driver_availability_update", handleAvailabilityUpdate);
    };
  }, [socket]);

  // Detección de toques en el mapa cercanos a un conductor (Hit-testing de proximidad)
  const handleMapPress = useCallback(
    (coord: LatLng) => {
      const THRESHOLD = 0.003; // ~300 metros de tolerancia de toque
      let closest: LiveDriver | null = null;
      let minDist = Infinity;

      for (const d of drivers) {
        if (!d.location?.lat || !d.location?.lng) continue;
        const dLat = Math.abs(Number(d.location.lat) - coord.latitude);
        const dLng = Math.abs(Number(d.location.lng) - coord.longitude);
        const dist = Math.hypot(dLat, dLng);
        if (dist < THRESHOLD && dist < minDist) {
          minDist = dist;
          closest = d;
        }
      }

      if (closest) {
        setSelectedDriver(closest);
        mapRef.current?.animateToRegion(
          {
            latitude: Number(closest.location!.lat),
            longitude: Number(closest.location!.lng),
            latitudeDelta: 0.015,
            longitudeDelta: 0.015,
          },
          350
        );
      } else {
        setSelectedDriver(null);
        setFollowDriverId(null);
      }
    },
    [drivers]
  );

  // Estadísticas rápidas de la flota
  const activeCount = useMemo(() => drivers.filter((d) => d.isAvailable).length, [drivers]);
  const carsCount = useMemo(() => drivers.filter((d) => d.serviceType !== "MOTO").length, [drivers]);
  const motosCount = useMemo(() => drivers.filter((d) => d.serviceType === "MOTO").length, [drivers]);

  // Marcadores de mapa con vehículo, halo y flecha de dirección
  const markers: AppMapMarker[] = useMemo(() => {
    const list: AppMapMarker[] = [];
    const now = Date.now();

    for (const d of drivers) {
      const lat = Number(d.location?.lat);
      const lng = Number(d.location?.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) continue;

      const isSelected = selectedDriver?.id === d.id;
      const isMoto = d.serviceType === "MOTO";
      const isOnline = d.isAvailable;
      const isMoving = Boolean(d.isMoving && d.lastMovedAt && now - d.lastMovedAt < 45000);
      const bearing = d.bearing ?? 0;

      list.push({
        id: `driver-${d.id}`,
        coordinate: { latitude: lat, longitude: lng },
        pinColor: isSelected ? colors.neon : isOnline ? "#4CAF50" : "#888888",
        onPress: () => {
          setSelectedDriver(d);
          mapRef.current?.animateToRegion(
            {
              latitude: lat,
              longitude: lng,
              latitudeDelta: 0.015,
              longitudeDelta: 0.015,
            },
            350
          );
        },
        children: (
          <View style={[styles.markerContainer, isSelected && styles.markerSelected]}>
            {/* Halo pulsante cuando está en movimiento */}
            {isMoving ? <View style={styles.movingHalo} /> : null}

            <View
              style={[
                styles.vehicleBadge,
                { backgroundColor: isOnline ? (isSelected ? colors.neon : "#0A192F") : "#1A1A1A" },
                { borderColor: isSelected ? "#FFFFFF" : isOnline ? colors.neon : "#555555" },
              ]}
            >
              <Ionicons
                name={isMoto ? "bicycle" : "car"}
                size={16}
                color={isSelected ? "#FFFFFF" : isOnline ? colors.neon : "#888888"}
              />

              {/* Indicador de rumbo / orientación */}
              {d.bearing != null ? (
                <View
                  style={[
                    styles.bearingArrowWrap,
                    { transform: [{ rotate: `${bearing}deg` }] },
                  ]}
                >
                  <Ionicons name="navigate" size={10} color={isSelected ? "#00E5FF" : colors.neon} />
                </View>
              ) : null}
            </View>

            <View style={[styles.driverNamePill, isSelected && styles.driverNamePillSelected]}>
              <Text style={styles.driverNamePillText} numberOfLines={1}>
                {d.fullName.split(" ")[0]}
              </Text>
            </View>
          </View>
        ),
      });
    }

    return list;
  }, [drivers, selectedDriver?.id]);

  const handleAssignRide = async (rideId: string) => {
    if (!token || !selectedDriver) return;
    setAssigningRideId(rideId);
    try {
      const res = await apiAdminAssignRideDriver(token, {
        rideId,
        driverId: selectedDriver.id,
      });
      if (res.ok) {
        Alert.alert(
          "¡Servicio Asignado!",
          `El servicio #${rideId.slice(-6)} fue asignado con éxito a ${selectedDriver.fullName}.`
        );
        setAssignModalVisible(false);
        void fetchFleet(true);
      }
    } catch (e) {
      Alert.alert("Error al asignar", e instanceof Error ? e.message : "No se pudo asignar el servicio.");
    } finally {
      setAssigningRideId(null);
    }
  };

  const handleCallDriver = (phone: string) => {
    if (!phone) return;
    void Linking.openURL(`tel:${phone}`);
  };

  const handleWhatsappDriver = (phone: string, name: string) => {
    if (!phone) return;
    const url = buildWhatsappLink({
      phone,
      text: `Hola ${name}, te escribo desde la administración de Xpress Traslados.`,
    });
    void Linking.openURL(url);
  };

  return (
    <View style={styles.container}>
      {/* Top Floating Header */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <Pressable
            style={({ pressed }) => [styles.backBtn, pressed && styles.btnPressed]}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </Pressable>

          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.headerTitle}>Flota en Vivo</Text>
            <Text style={styles.headerSub}>Control y Asignación Satelital</Text>
          </View>

          <Pressable
            style={({ pressed }) => [styles.refreshBtn, pressed && styles.btnPressed]}
            onPress={() => void fetchFleet(false)}
            disabled={loading || refreshing}
          >
            {loading || refreshing ? (
              <ActivityIndicator size="small" color={colors.neon} />
            ) : (
              <Ionicons name="refresh" size={18} color={colors.neon} />
            )}
          </Pressable>
        </View>

        {/* Quick Stats Pill Row */}
        <View style={styles.statsPillRow}>
          <View style={styles.statPill}>
            <View style={[styles.statDot, { backgroundColor: "#4CAF50" }]} />
            <Text style={styles.statPillText}>{activeCount} En línea</Text>
          </View>

          <View style={styles.statPill}>
            <Ionicons name="car-outline" size={12} color={colors.neon} />
            <Text style={styles.statPillText}>{carsCount} Carros</Text>
          </View>

          <View style={styles.statPill}>
            <Ionicons name="bicycle-outline" size={12} color="#00E5FF" />
            <Text style={styles.statPillText}>{motosCount} Motos</Text>
          </View>

          <View style={[styles.statPill, pendingRides.length > 0 && styles.statPillAlert]}>
            <Ionicons name="navigate-outline" size={12} color={pendingRides.length > 0 ? "#FF9800" : "#888"} />
            <Text style={[styles.statPillText, pendingRides.length > 0 && { color: "#FF9800", fontWeight: "bold" }]}>
              {pendingRides.length} Pendientes
            </Text>
          </View>
        </View>
      </View>

      {/* Mapbox Map */}
      <View style={styles.mapWrap}>
        <AppMap
          ref={(r) => {
            mapRef.current = r;
          }}
          style={StyleSheet.absoluteFill}
          initialRegion={{
            ...INITIAL_CENTER,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
          rotateEnabled
          pitchEnabled={false}
          scrollEnabled
          zoomEnabled
          markers={markers}
          onPress={handleMapPress}
        />
      </View>

      {/* Error Banner */}
      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      ) : null}

      {/* Horizontal Driver Quick-Bar / Selector */}
      <View style={styles.carouselWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carouselScroll}>
          {drivers.map((d) => {
            const isSel = selectedDriver?.id === d.id;
            const hasLoc = Boolean(d.location?.lat && d.location?.lng);
            const isOnline = d.isAvailable;
            const isMov = Boolean(d.isMoving && d.lastMovedAt && Date.now() - d.lastMovedAt < 45000);

            return (
              <Pressable
                key={d.id}
                style={({ pressed }) => [
                  styles.driverChip,
                  isSel && styles.driverChipSelected,
                  pressed && styles.btnPressed,
                ]}
                onPress={() => {
                  setSelectedDriver(d);
                  if (hasLoc) {
                    mapRef.current?.animateToRegion(
                      {
                        latitude: Number(d.location!.lat),
                        longitude: Number(d.location!.lng),
                        latitudeDelta: 0.015,
                        longitudeDelta: 0.015,
                      },
                      350
                    );
                  }
                }}
              >
                <View
                  style={[
                    styles.chipDot,
                    { backgroundColor: isOnline ? (isMov ? "#00E5FF" : "#4CAF50") : "#666666" },
                  ]}
                />
                <Ionicons
                  name={d.serviceType === "MOTO" ? "bicycle" : "car"}
                  size={13}
                  color={isSel ? colors.neon : "#FFFFFF"}
                />
                <Text style={[styles.chipName, isSel && styles.chipNameSelected]} numberOfLines={1}>
                  {d.fullName.split(" ")[0]}
                </Text>
                {isMov ? (
                  <View style={styles.chipMovingBadge}>
                    <Ionicons name="flash" size={9} color="#00E5FF" />
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Floating Selected Driver Sheet */}
      {selectedDriver ? (
        <View style={styles.sheetOverlay}>
          <View style={styles.driverSheet}>
            {/* Close Sheet Button */}
            <Pressable
              style={styles.sheetCloseBtn}
              onPress={() => {
                setSelectedDriver(null);
                setFollowDriverId(null);
              }}
            >
              <Ionicons name="close" size={18} color="#FFFFFF" />
            </Pressable>

            {/* Driver Profile Header */}
            <View style={styles.sheetHeaderRow}>
              {selectedDriver.photoUrl ? (
                <Image
                  source={{ uri: absoluteUrl(selectedDriver.photoUrl) || undefined }}
                  style={styles.sheetAvatar}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.sheetAvatarFallback}>
                  <Ionicons name="person" size={24} color={colors.neon} />
                </View>
              )}

              <View style={{ flex: 1, marginLeft: 12 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text style={styles.sheetDriverName} numberOfLines={1}>
                    {selectedDriver.fullName}
                  </Text>
                  <View
                    style={[
                      styles.onlineStatusBadge,
                      { backgroundColor: selectedDriver.isAvailable ? "rgba(76,175,80,0.2)" : "rgba(136,136,136,0.2)" },
                    ]}
                  >
                    <Text
                      style={[
                        styles.onlineStatusText,
                        { color: selectedDriver.isAvailable ? "#4CAF50" : "#888888" },
                      ]}
                    >
                      {selectedDriver.isAvailable ? "En Línea" : "Inactivo"}
                    </Text>
                  </View>
                </View>

                {/* Rating & Completed Rides */}
                <View style={styles.metricsRow}>
                  <View style={styles.metricItem}>
                    <Ionicons name="star" size={14} color="#FFC107" />
                    <Text style={styles.metricText}>
                      {Number(selectedDriver.avgRating ?? 5.0).toFixed(1)}
                    </Text>
                    <Text style={styles.metricSub}>({selectedDriver.ratingsCount ?? 0})</Text>
                  </View>

                  <Text style={styles.metricDivider}>•</Text>

                  <View style={styles.metricItem}>
                    <Ionicons name="checkmark-done" size={14} color="#4CAF50" />
                    <Text style={styles.metricText}>
                      {selectedDriver.completedRidesCount ?? 0} viajes
                    </Text>
                  </View>

                  <Text style={styles.metricDivider}>•</Text>

                  <Text style={styles.metricSub}>
                    {serviceTypeLabel(selectedDriver.serviceType as any)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Real-time Movement & Heading Status */}
            <View style={styles.movementCard}>
              <View style={styles.movementHeaderRow}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <View
                    style={[
                      styles.movementLiveDot,
                      { backgroundColor: selectedDriver.isMoving ? "#00E5FF" : "#4CAF50" },
                    ]}
                  />
                  <Text style={styles.movementStatusTitle}>
                    {selectedDriver.isMoving ? "En Movimiento en Tiempo Real" : "Ubicación Satelital"}
                  </Text>
                </View>

                {/* Follow Mode Toggle */}
                <Pressable
                  style={[
                    styles.followToggleBtn,
                    followDriverId === selectedDriver.id && styles.followToggleBtnActive,
                  ]}
                  onPress={() => {
                    if (followDriverId === selectedDriver.id) {
                      setFollowDriverId(null);
                    } else {
                      setFollowDriverId(selectedDriver.id);
                      if (selectedDriver.location?.lat && selectedDriver.location?.lng) {
                        mapRef.current?.animateToRegion(
                          {
                            latitude: Number(selectedDriver.location.lat),
                            longitude: Number(selectedDriver.location.lng),
                            latitudeDelta: 0.012,
                            longitudeDelta: 0.012,
                          },
                          350
                        );
                      }
                    }
                  }}
                >
                  <Ionicons
                    name={followDriverId === selectedDriver.id ? "locate" : "locate-outline"}
                    size={13}
                    color={followDriverId === selectedDriver.id ? "#000000" : colors.neon}
                  />
                  <Text
                    style={[
                      styles.followToggleText,
                      followDriverId === selectedDriver.id && styles.followToggleTextActive,
                    ]}
                  >
                    {followDriverId === selectedDriver.id ? "Siguiendo" : "Seguir"}
                  </Text>
                </Pressable>
              </View>

              <View style={styles.movementDetailsRow}>
                {selectedDriver.bearing != null ? (
                  <View style={styles.movementDetailItem}>
                    <Ionicons name="compass-outline" size={14} color="#00E5FF" />
                    <Text style={styles.movementDetailText}>
                      Rumbo: {bearingToCardinal(selectedDriver.bearing)} ({selectedDriver.bearing}°)
                    </Text>
                  </View>
                ) : null}

                {selectedDriver.speed != null && selectedDriver.speed > 0 ? (
                  <View style={styles.movementDetailItem}>
                    <Ionicons name="speedometer-outline" size={14} color="#4CAF50" />
                    <Text style={styles.movementDetailText}>
                      {Math.round(selectedDriver.speed * 3.6)} km/h
                    </Text>
                  </View>
                ) : null}

                <Text style={styles.movementAgoText}>
                  {selectedDriver.location?.updatedAt
                    ? `Actualizado: ${new Date(selectedDriver.location.updatedAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}`
                    : "En vivo"}
                </Text>
              </View>
            </View>

            {/* Vehicle & Contact Details */}
            <View style={styles.sheetDetailsBox}>
              <View style={styles.detailRow}>
                <Ionicons name="car-sport-outline" size={16} color={colors.neon} />
                <Text style={styles.detailText}>
                  {selectedDriver.vehicle
                    ? `${selectedDriver.vehicle.brand || ""} ${selectedDriver.vehicle.model || ""} • Placa: ${selectedDriver.vehicle.plate || "S/P"}`
                    : "Vehículo no registrado"}
                </Text>
              </View>

              {selectedDriver.phone ? (
                <View style={styles.detailRow}>
                  <Ionicons name="call-outline" size={16} color="#4CAF50" />
                  <Text style={styles.detailText}>{selectedDriver.phone}</Text>
                  <View style={{ flex: 1 }} />
                  <Pressable
                    style={styles.contactIconBtn}
                    onPress={() => handleCallDriver(selectedDriver.phone)}
                  >
                    <Ionicons name="call" size={14} color="#FFFFFF" />
                  </Pressable>
                  <Pressable
                    style={[styles.contactIconBtn, { backgroundColor: "#25D366" }]}
                    onPress={() => handleWhatsappDriver(selectedDriver.phone, selectedDriver.fullName)}
                  >
                    <Ionicons name="logo-whatsapp" size={14} color="#FFFFFF" />
                  </Pressable>
                </View>
              ) : null}
            </View>

            {/* Action Button: Asignar Servicio */}
            <Pressable
              style={({ pressed }) => [styles.assignBtn, pressed && styles.btnPressed]}
              onPress={() => setAssignModalVisible(true)}
            >
              <Ionicons name="navigate" size={18} color="#FFFFFF" />
              <Text style={styles.assignBtnText}>
                Asignar Servicio {pendingRides.length > 0 ? `(${pendingRides.length} disponibles)` : ""}
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {/* Modal: Asignar Servicio Pendiente */}
      <Modal
        visible={assignModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAssignModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Asignar Servicio</Text>
                <Text style={styles.modalSub}>
                  Conductor: {selectedDriver?.fullName || "Ejecutivo"}
                </Text>
              </View>
              <Pressable
                style={styles.modalCloseBtn}
                onPress={() => setAssignModalVisible(false)}
              >
                <Ionicons name="close" size={20} color="#FFFFFF" />
              </Pressable>
            </View>

            {pendingRides.length === 0 ? (
              <View style={styles.emptyPendingWrap}>
                <Ionicons name="file-tray-outline" size={44} color="#555555" />
                <Text style={styles.emptyPendingTitle}>No hay solicitudes pendientes</Text>
                <Text style={styles.emptyPendingText}>
                  Actualmente no hay carreras en estado "Buscando ejecutivo" para asignar.
                </Text>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
                {pendingRides.map((ride) => {
                  const isAssigningThis = assigningRideId === ride.id;
                  const price = ride.agreedPrice || ride.estimatedPrice || 0;

                  return (
                    <View key={ride.id} style={styles.rideItemCard}>
                      <View style={styles.rideItemHeader}>
                        <View style={styles.rideIdBadge}>
                          <Text style={styles.rideIdBadgeText}>#{ride.id.slice(-6)}</Text>
                        </View>
                        <Text style={styles.rideTypeText}>
                          {serviceTypeLabel(ride.serviceTypeWanted as any)}
                        </Text>
                        <View style={{ flex: 1 }} />
                        <Text style={styles.ridePriceText}>{formatCop(Number(price))}</Text>
                      </View>

                      {ride.passenger ? (
                        <Text style={styles.ridePassengerText}>
                          Cliente: {ride.passenger.fullName}
                        </Text>
                      ) : null}

                      <View style={styles.routeRow}>
                        <View style={[styles.routeDot, { backgroundColor: colors.neon }]} />
                        <Text style={styles.routeText} numberOfLines={1}>
                          {ride.pickupAddress || "Origen"}
                        </Text>
                      </View>

                      <View style={styles.routeRow}>
                        <View style={[styles.routeDot, { backgroundColor: "#FF5252" }]} />
                        <Text style={styles.routeText} numberOfLines={1}>
                          {ride.dropoffAddress || "Destino"}
                        </Text>
                      </View>

                      <Pressable
                        style={({ pressed }) => [styles.assignRideActionBtn, pressed && styles.btnPressed]}
                        onPress={() => handleAssignRide(ride.id)}
                        disabled={isAssigningThis}
                      >
                        {isAssigningThis ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <>
                            <Ionicons name="checkmark-circle-outline" size={16} color="#FFFFFF" />
                            <Text style={styles.assignRideActionBtnText}>Asignar a este Conductor</Text>
                          </>
                        )}
                      </Pressable>
                    </View>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    paddingTop: 48,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 0, 255, 0.3)",
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  refreshBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(0, 0, 255, 0.15)",
    borderWidth: 1,
    borderColor: colors.neon,
    justifyContent: "center",
    alignItems: "center",
  },
  btnPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.96 }],
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
    letterSpacing: 0.4,
  },
  headerSub: {
    color: colors.neon,
    fontSize: 11,
    marginTop: 1,
    fontWeight: "600",
  },
  statsPillRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  statPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  statPillAlert: {
    borderColor: "rgba(255, 152, 0, 0.4)",
    backgroundColor: "rgba(255, 152, 0, 0.1)",
  },
  statDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  statPillText: {
    color: "#E0E0E0",
    fontSize: 11,
    fontWeight: "500",
  },
  mapWrap: {
    flex: 1,
  },
  errorBanner: {
    position: "absolute",
    top: 135,
    left: 16,
    right: 16,
    zIndex: 25,
    backgroundColor: "rgba(255, 59, 48, 0.9)",
    borderRadius: 8,
    padding: 8,
  },
  errorBannerText: {
    color: "#FFFFFF",
    fontSize: 12,
    textAlign: "center",
  },
  markerContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  markerSelected: {
    transform: [{ scale: 1.15 }],
  },
  movingHalo: {
    position: "absolute",
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: "#00E5FF",
    backgroundColor: "rgba(0, 229, 255, 0.15)",
  },
  vehicleBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: colors.neon,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 8,
  },
  bearingArrowWrap: {
    position: "absolute",
    top: -6,
    alignSelf: "center",
  },
  driverNamePill: {
    marginTop: 3,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  driverNamePillSelected: {
    borderColor: colors.neon,
    backgroundColor: "rgba(0, 0, 255, 0.85)",
  },
  driverNamePillText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "bold",
  },
  carouselWrap: {
    position: "absolute",
    bottom: 24,
    left: 0,
    right: 0,
    zIndex: 15,
  },
  carouselScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  driverChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(10, 13, 20, 0.92)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 6,
  },
  driverChipSelected: {
    borderColor: colors.neon,
    backgroundColor: "rgba(0, 0, 255, 0.25)",
  },
  chipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  chipName: {
    color: "#CCCCCC",
    fontSize: 12,
    fontWeight: "600",
  },
  chipNameSelected: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  chipMovingBadge: {
    marginLeft: 2,
  },
  sheetOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 30,
    padding: 14,
    paddingBottom: 28,
  },
  driverSheet: {
    backgroundColor: "#0A0D14",
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: colors.neon,
    padding: 16,
    shadowColor: colors.neon,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 16,
  },
  sheetCloseBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 5,
  },
  sheetHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 32,
  },
  sheetAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: colors.neon,
  },
  sheetAvatarFallback: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: colors.neon,
    backgroundColor: "rgba(0, 0, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  sheetDriverName: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  onlineStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  onlineStatusText: {
    fontSize: 10,
    fontWeight: "bold",
  },
  metricsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  metricItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  metricText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "bold",
  },
  metricSub: {
    color: "#888888",
    fontSize: 11,
  },
  metricDivider: {
    color: "#444444",
    fontSize: 10,
  },
  movementCard: {
    marginTop: 10,
    backgroundColor: "rgba(0, 229, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(0, 229, 255, 0.2)",
    borderRadius: 12,
    padding: 10,
    gap: 6,
  },
  movementHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  movementLiveDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  movementStatusTitle: {
    color: "#00E5FF",
    fontSize: 11,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  followToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.neon,
    backgroundColor: "rgba(0, 0, 255, 0.15)",
  },
  followToggleBtnActive: {
    backgroundColor: colors.neon,
    borderColor: "#FFFFFF",
  },
  followToggleText: {
    color: colors.neon,
    fontSize: 10,
    fontWeight: "bold",
  },
  followToggleTextActive: {
    color: "#FFFFFF",
  },
  movementDetailsRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  movementDetailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  movementDetailText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "500",
  },
  movementAgoText: {
    color: "#888888",
    fontSize: 10,
    marginLeft: "auto",
  },
  sheetDetailsBox: {
    marginTop: 10,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderRadius: 12,
    padding: 10,
    gap: 8,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailText: {
    color: "#CCCCCC",
    fontSize: 12,
    flex: 1,
  },
  contactIconBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.neon,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 6,
  },
  assignBtn: {
    marginTop: 12,
    height: 44,
    backgroundColor: colors.neon,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    shadowColor: colors.neon,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 8,
  },
  assignBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "bold",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    padding: 16,
  },
  modalCard: {
    backgroundColor: "#0A0D14",
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: colors.neon,
    padding: 18,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
    paddingBottom: 12,
    marginBottom: 12,
  },
  modalTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "bold",
  },
  modalSub: {
    color: "#888888",
    fontSize: 12,
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  emptyPendingWrap: {
    padding: 30,
    alignItems: "center",
    gap: 8,
  },
  emptyPendingTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "bold",
  },
  emptyPendingText: {
    color: "#888888",
    fontSize: 12,
    textAlign: "center",
  },
  rideItemCard: {
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    padding: 12,
    marginBottom: 10,
    gap: 6,
  },
  rideItemHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  rideIdBadge: {
    backgroundColor: "rgba(0, 0, 255, 0.2)",
    borderWidth: 1,
    borderColor: colors.neon,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  rideIdBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "bold",
  },
  rideTypeText: {
    color: "#888888",
    fontSize: 11,
  },
  ridePriceText: {
    color: "#4CAF50",
    fontSize: 13,
    fontWeight: "bold",
  },
  ridePassengerText: {
    color: "#E0E0E0",
    fontSize: 12,
    fontWeight: "600",
  },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  routeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  routeText: {
    color: "#CCCCCC",
    fontSize: 12,
    flex: 1,
  },
  assignRideActionBtn: {
    marginTop: 6,
    height: 36,
    backgroundColor: colors.neon,
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  assignRideActionBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "bold",
  },
});
