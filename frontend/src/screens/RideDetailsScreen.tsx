import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import type { RootStackParamList } from "../navigation/AppNavigator";
import { Screen } from "../components/Screen";
import { Card } from "../components/Card";
import { AppMap } from "../components/AppMap";
import { MiniRouteMap } from "../components/MiniRouteMap";
import { colors } from "../theme/colors";
import { useAuth } from "../auth/AuthContext";
import { apiGetDriverTechSheet, apiGetRideById } from "../rides/rides.api";
import { DriverTechSheetModal } from "../drivers/DriverTechSheetModal";
import { serviceTypeLabel } from "../utils/serviceType";
import { PassengerTechSheetModal } from "../passengers/PassengerTechSheetModal";
import { formatDateYMD } from "../utils/format";
import { formatCop } from "../utils/currency";
import { rideStatusLabel } from "../utils/labels";
import { subscribeRealtimeEvent } from "../realtime/socket";
import { openPhoneCall, openWhatsappMessage } from "../utils/phone";

type Props = NativeStackScreenProps<RootStackParamList, "RideDetails">;

type RideRow = any;

export function RideDetailsScreen({ route }: Props) {
  const auth = useAuth();
  const token = auth.token;
  const role = auth.user?.role;

  const [ride, setRide] = useState<RideRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [techOpen, setTechOpen] = useState(false);
  const [techDriver, setTechDriver] = useState<any | null>(null);

  const [passengerTechOpen, setPassengerTechOpen] = useState(false);

  const rideId = route.params.rideId;

  const title = useMemo(() => `Detalle #${String(rideId).slice(-6)}`, [rideId]);

  async function load() {
    if (!token) return;
    setError(null);
    setLoading(true);
    try {
      const res = await apiGetRideById(token, { rideId });
      setRide(res.ride);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cargar el detalle");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, rideId]);

  useEffect(() => {
    if (!token) return;
    const cleanup = subscribeRealtimeEvent("ride:changed", (payload: any) => {
      if (String(payload?.rideId) === String(rideId)) {
        void load();
      }
    });
    return () => cleanup();
  }, [token, rideId]);

  async function openDriverTechSheet() {
    if (!token) return;
    const driverId = ride?.matchedDriver?.id;
    if (!driverId) return;

    try {
      const res = await apiGetDriverTechSheet(token, { driverId });
      setTechDriver(res.driver);
      setTechOpen(true);
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "No se pudo cargar la ficha técnica");
    }
  }

  if (!token) {
    return (
      <Screen>
        <Card style={{ marginTop: 16 }}>
          <Text style={{ color: colors.text, fontWeight: "900" }}>Sesión no válida.</Text>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <DriverTechSheetModal
        visible={techOpen}
        driver={techDriver}
        onClose={() => {
          setTechOpen(false);
          setTechDriver(null);
        }}
      />

      <PassengerTechSheetModal
        visible={passengerTechOpen}
        passenger={
          ride?.passenger
            ? {
                fullName: ride.passenger.fullName ?? "—",
                phone: ride.passenger.phone ?? null,
                email: ride.passenger.user?.email ?? null,
                photoUrl: ride.passenger.photoUrl ?? null,
              }
            : null
        }
        onClose={() => setPassengerTechOpen(false)}
      />

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Ionicons name="document-text-outline" size={20} color={colors.neon} />
            <Text style={styles.title}>{title}</Text>
          </View>

          <Pressable onPress={() => void load()} style={({ pressed }) => [styles.refreshBtn, pressed && styles.pressed]}>
            <Ionicons name="refresh" size={18} color={colors.neon} />
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.centerRow}>
            <ActivityIndicator color={colors.neon} />
            <Text style={styles.muted}>Cargando...</Text>
          </View>
        ) : null}

        {!!error ? (
          <Card style={{ borderColor: colors.danger, borderWidth: 1 }}>
            <Text style={styles.error}>{error}</Text>
          </Card>
        ) : null}

        {ride ? (
          <>
            {/* Map Card */}
            {(() => {
              const pLat = Number(ride.pickupLat);
              const pLng = Number(ride.pickupLng);
              const dLat = Number(ride.dropoffLat);
              const dLng = Number(ride.dropoffLng);
              const hasPickup = Number.isFinite(pLat) && Number.isFinite(pLng) && pLat !== 0;
              const hasDropoff = Number.isFinite(dLat) && Number.isFinite(dLng) && dLat !== 0;

              return hasPickup && hasDropoff ? (
                <Card style={{ padding: 0, overflow: "hidden" }}>
                  <View style={{ height: 180, width: "100%" }}>
                    <MiniRouteMap
                      pickup={{ lat: pLat, lng: pLng }}
                      dropoff={{ lat: dLat, lng: dLng }}
                      routePath={ride.routePath}
                      height={180}
                    />
                  </View>
                </Card>
              ) : hasPickup ? (
                <Card style={{ padding: 0, overflow: "hidden" }}>
                  <View style={{ height: 180, width: "100%" }}>
                    <AppMap
                      style={StyleSheet.absoluteFill}
                      initialRegion={{
                        latitude: pLat,
                        longitude: pLng,
                        latitudeDelta: 0.03,
                        longitudeDelta: 0.03,
                      }}
                      markers={[
                        { id: "pickup", coordinate: { latitude: pLat, longitude: pLng }, pinColor: colors.neon }
                      ]}
                      pitchEnabled={false}
                      rotateEnabled={false}
                      scrollEnabled
                      zoomEnabled
                    />
                  </View>
                </Card>
              ) : null;
            })()}

            {/* Locations Card */}
            <Card style={styles.card}>
              <Text style={styles.cardTitle}>Ubicación y Destino</Text>
              <View style={{ gap: 8, marginTop: 4 }}>
                <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
                  <Ionicons name="location" size={18} color={colors.neon} style={{ marginTop: 2 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.muted, { color: colors.neon, fontWeight: "bold" }]}>Origen (Recogida):</Text>
                    <Text style={[styles.line, { fontWeight: "bold", fontSize: 14 }]}>
                      {ride.pickupText || ride.pickupAddress || "Origen no especificado"}
                    </Text>
                  </View>
                </View>

                <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
                  <Ionicons name="flag" size={18} color="#F44336" style={{ marginTop: 2 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.muted, { color: "#F44336", fontWeight: "bold" }]}>Destino (Llegada):</Text>
                    <Text style={[styles.line, { fontWeight: "bold", fontSize: 14 }]}>
                      {ride.dropoffText || ride.dropoffAddress || "Destino no especificado"}
                    </Text>
                  </View>
                </View>
              </View>
            </Card>

            <Card style={styles.card}>
              <Text style={styles.cardTitle}>Información del Servicio</Text>
              <Text style={styles.line}>Estado: {rideStatusLabel({ status: ride.status, role: role || "USER", canRate: false })}</Text>
              <Text style={styles.line}>Servicio: {ride.serviceTypeWanted ? serviceTypeLabel(ride.serviceTypeWanted) : "—"}</Text>
              <Text style={styles.line}>Precio: {formatCop(Number(ride.agreedPrice || ride.estimatedPrice || 0))}</Text>
              {ride.distanceMeters ? <Text style={styles.line}>Distancia: {(Number(ride.distanceMeters) / 1000).toFixed(1)} km</Text> : null}
              <Text style={styles.muted}>Creado: {formatDateYMD(ride.createdAt) ?? "—"}</Text>
            </Card>

            <Card style={styles.card}>
              <Text style={styles.cardTitle}>Cliente</Text>
              <Text style={styles.line}>Nombre: {ride.passenger?.fullName || "—"}</Text>
              {ride.passenger?.phone ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap", marginVertical: 2 }}>
                  <Text style={styles.line}>Tel: {ride.passenger.phone}</Text>
                  <Pressable style={styles.phoneBadge} onPress={() => openPhoneCall(ride.passenger.phone)}>
                    <Ionicons name="call" size={12} color="#fff" />
                    <Text style={styles.badgeText}>Llamar</Text>
                  </Pressable>
                  <Pressable style={styles.whatsappBadge} onPress={() => openWhatsappMessage(ride.passenger.phone)}>
                    <Ionicons name="logo-whatsapp" size={12} color="#fff" />
                    <Text style={styles.badgeText}>WhatsApp</Text>
                  </Pressable>
                </View>
              ) : <Text style={styles.line}>Tel: —</Text>}
              <Text style={styles.line}>Correo: {ride.passenger?.user?.email || "—"}</Text>

              {(role === "DRIVER" || role === "ADMIN") && ride.passenger ? (
                <Pressable onPress={() => setPassengerTechOpen(true)} style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}>
                  <Ionicons name="id-card-outline" size={18} color={colors.neon} />
                  <Text style={styles.actionText}>Ver ficha del cliente</Text>
                </Pressable>
              ) : null}
            </Card>

            <Card style={styles.card}>
              <Text style={styles.cardTitle}>Ejecutivo</Text>
              <Text style={styles.line}>Nombre: {ride.matchedDriver?.fullName || "—"}</Text>
              {ride.matchedDriver?.phone ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap", marginVertical: 2 }}>
                  <Text style={styles.line}>Tel: {ride.matchedDriver.phone}</Text>
                  <Pressable style={styles.phoneBadge} onPress={() => openPhoneCall(ride.matchedDriver.phone)}>
                    <Ionicons name="call" size={12} color="#fff" />
                    <Text style={styles.badgeText}>Llamar</Text>
                  </Pressable>
                  <Pressable style={styles.whatsappBadge} onPress={() => openWhatsappMessage(ride.matchedDriver.phone)}>
                    <Ionicons name="logo-whatsapp" size={12} color="#fff" />
                    <Text style={styles.badgeText}>WhatsApp</Text>
                  </Pressable>
                </View>
              ) : <Text style={styles.line}>Tel: —</Text>}

              {role === "USER" && ride.matchedDriver?.id ? (
                <Pressable onPress={() => void openDriverTechSheet()} style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}
                >
                  <Ionicons name="id-card-outline" size={18} color={colors.neon} />
                  <Text style={styles.actionText}>Ver ficha técnica</Text>
                </Pressable>
              ) : null}
            </Card>
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingTop: 10,
    paddingBottom: 40,
    gap: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
  },
  refreshBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  actionBtn: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  actionText: {
    color: colors.text,
    fontWeight: "900",
  },
  pressed: {
    opacity: 0.85,
  },
  centerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  muted: {
    color: colors.mutedText,
    fontSize: 13,
    fontWeight: "700",
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: "900",
  },
  card: {
    gap: 6,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "900",
  },
  line: {
    color: colors.text,
    fontSize: 13,
  },
  phoneBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#2196F3",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  whatsappBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#25D366",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900",
  },
});
