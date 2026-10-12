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
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [assigningRideId, setAssigningRideId] = useState<string | null>(null);

  const mapRef = useRef<AppMapRef | null>(null);

  const fetchFleet = useCallback(async (isSilent = false) => {
    if (!token) return;
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const res = await apiAdminGetLiveFleet(token);
      if (res.ok) {
        setDrivers(res.drivers || []);
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

    const handleLocationUpdate = (payload: { driverId: string; lat: number; lng: number }) => {
      if (!payload?.driverId || payload.lat == null || payload.lng == null) return;
      setDrivers((prev) =>
        prev.map((d) => {
          if (d.id === payload.driverId) {
            return {
              ...d,
              location: {
                lat: payload.lat,
                lng: payload.lng,
                updatedAt: new Date().toISOString(),
              },
            };
          }
          return d;
        })
      );

      // Si el conductor seleccionado es el que se movió, actualizamos su objeto local
      setSelectedDriver((cur) => {
        if (cur && cur.id === payload.driverId) {
          return {
            ...cur,
            location: {
              lat: payload.lat,
              lng: payload.lng,
              updatedAt: new Date().toISOString(),
            },
          };
        }
        return cur;
      });
    };

    const handleAvailabilityUpdate = (payload: { driverId: string; isAvailable: boolean }) => {
      if (!payload?.driverId) return;
      setDrivers((prev) =>
        prev.map((d) => (d.id === payload.driverId ? { ...d, isAvailable: payload.isAvailable } : d))
      );
    };

    socket.on("driver_location_update", handleLocationUpdate);
    socket.on("driver_availability_update", handleAvailabilityUpdate);

    return () => {
      socket.off("driver_location_update", handleLocationUpdate);
      socket.off("driver_availability_update", handleAvailabilityUpdate);
    };
  }, [socket]);

  // Estadísticas rápidas de la flota
  const activeCount = useMemo(() => drivers.filter((d) => d.isAvailable).length, [drivers]);
  const carsCount = useMemo(() => drivers.filter((d) => d.serviceType !== "MOTO").length, [drivers]);
  const motosCount = useMemo(() => drivers.filter((d) => d.serviceType === "MOTO").length, [drivers]);

  // Marcadores de mapa con vehículo correspondiente
  const markers: AppMapMarker[] = useMemo(() => {
    const list: AppMapMarker[] = [];

    for (const d of drivers) {
      const lat = Number(d.location?.lat);
      const lng = Number(d.location?.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) continue;

      const isSelected = selectedDriver?.id === d.id;
      const isMoto = d.serviceType === "MOTO";
      const isOnline = d.isAvailable;

      list.push({
        id: `driver-${d.id}`,
        coordinate: { latitude: lat, longitude: lng },
        pinColor: isSelected ? colors.neon : isOnline ? "#4CAF50" : "#888888",
        onPress: () => setSelectedDriver(d),
        children: (
          <View style={[styles.markerContainer, isSelected && styles.markerSelected]}>
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
            </View>
            <View style={styles.driverNamePill}>
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

          <View style={{ flex: 1, marginLeft: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={styles.headerTitle}>Flota en Vivo</Text>
              <View style={styles.livePulseDot} />
            </View>
            <Text style={styles.headerSub}>Monitoreo en tiempo real</Text>
          </View>

          <Pressable
            style={({ pressed }) => [styles.refreshBtn, pressed && styles.btnPressed]}
            onPress={() => void fetchFleet(false)}
          >
            {refreshing || loading ? (
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
        />
      </View>

      {/* Error Banner */}
      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      ) : null}

      {/* Floating Selected Driver Sheet */}
      {selectedDriver ? (
        <View style={styles.sheetOverlay}>
          <View style={styles.driverSheet}>
            {/* Close Sheet Button */}
            <Pressable style={styles.sheetCloseBtn} onPress={() => setSelectedDriver(null)}>
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

                      {/* Passenger */}
                      <Text style={styles.ridePassengerText} numberOfLines={1}>
                        👤 {ride.passenger?.fullName || "Cliente"} {ride.passenger?.phone ? `(${ride.passenger.phone})` : ""}
                      </Text>

                      {/* Route */}
                      <View style={styles.routeRow}>
                        <View style={[styles.routeDot, { backgroundColor: colors.neon }]} />
                        <Text style={styles.routeText} numberOfLines={1}>
                          <Text style={{ color: "#888888" }}>Origen: </Text>
                          {ride.pickupAddress || `${ride.pickupLat}, ${ride.pickupLng}`}
                        </Text>
                      </View>

                      <View style={styles.routeRow}>
                        <View style={[styles.routeDot, { backgroundColor: "#F44336" }]} />
                        <Text style={styles.routeText} numberOfLines={1}>
                          <Text style={{ color: "#888888" }}>Destino: </Text>
                          {ride.dropoffAddress || `${ride.dropoffLat}, ${ride.dropoffLng}`}
                        </Text>
                      </View>

                      {/* Assign button */}
                      <Pressable
                        style={({ pressed }) => [
                          styles.assignRideActionBtn,
                          pressed && styles.btnPressed,
                          isAssigningThis && { opacity: 0.6 },
                        ]}
                        disabled={isAssigningThis}
                        onPress={() => void handleAssignRide(ride.id)}
                      >
                        {isAssigningThis ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <>
                            <Ionicons name="checkmark-circle-outline" size={16} color="#FFFFFF" />
                            <Text style={styles.assignRideActionBtnText}>Asignar a este ejecutivo</Text>
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
    backgroundColor: colors.bg,
  },
  header: {
    position: "absolute",
    top: 48,
    left: 16,
    right: 16,
    zIndex: 99,
    backgroundColor: "rgba(10, 13, 20, 0.92)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 255, 0.35)",
    padding: 12,
    shadowColor: colors.neon,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(0, 0, 255, 0.15)",
    borderWidth: 1,
    borderColor: colors.neon,
    justifyContent: "center",
    alignItems: "center",
  },
  btnPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.96 }],
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "bold",
  },
  headerSub: {
    color: "#888888",
    fontSize: 11,
  },
  livePulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#4CAF50",
  },
  statsPillRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    flexWrap: "wrap",
  },
  statPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statPillAlert: {
    backgroundColor: "rgba(255, 152, 0, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(255, 152, 0, 0.4)",
  },
  statDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statPillText: {
    color: "#E0E0E0",
    fontSize: 11,
    fontWeight: "600",
  },
  mapWrap: {
    ...StyleSheet.absoluteFillObject,
  },
  markerContainer: {
    alignItems: "center",
  },
  markerSelected: {
    transform: [{ scale: 1.15 }],
  },
  vehicleBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: colors.neon,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
  },
  driverNamePill: {
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    marginTop: 2,
  },
  driverNamePillText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "bold",
  },
  errorBanner: {
    position: "absolute",
    top: 130,
    left: 20,
    right: 20,
    backgroundColor: "rgba(244, 67, 54, 0.9)",
    padding: 8,
    borderRadius: 8,
    zIndex: 90,
  },
  errorBannerText: {
    color: "#FFFFFF",
    fontSize: 12,
    textAlign: "center",
  },
  sheetOverlay: {
    position: "absolute",
    bottom: 24,
    left: 16,
    right: 16,
    zIndex: 100,
  },
  driverSheet: {
    backgroundColor: "rgba(10, 13, 20, 0.96)",
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: colors.neon,
    padding: 16,
    shadowColor: colors.neon,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 12,
  },
  sheetCloseBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  sheetHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  sheetAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1.5,
    borderColor: colors.neon,
  },
  sheetAvatarFallback: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(0, 0, 255, 0.15)",
    borderWidth: 1.5,
    borderColor: colors.neon,
    justifyContent: "center",
    alignItems: "center",
  },
  sheetDriverName: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
    flexShrink: 1,
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
    gap: 4,
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
    color: "#555555",
    fontSize: 11,
  },
  sheetDetailsBox: {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderRadius: 12,
    padding: 10,
    marginTop: 12,
    gap: 6,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailText: {
    color: "#D0D0D0",
    fontSize: 12,
  },
  contactIconBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.neon,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 6,
  },
  assignBtn: {
    marginTop: 14,
    height: 46,
    backgroundColor: colors.neon,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    shadowColor: colors.neon,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
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
