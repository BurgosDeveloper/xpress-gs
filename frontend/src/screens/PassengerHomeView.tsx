import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GSHeader } from "../components/GSHeader";
import { AppMap } from "../components/AppMap";
import { MiniRouteMap } from "../components/MiniRouteMap";
import { colors } from "../theme/colors";
import { formatCop } from "../utils/currency";
import { rideStatusLabel } from "../utils/labels";
import { clearActiveRideOffersRideId, setActiveRideOffersRideId } from "../lib/storage";
import { useUnreadChatCount } from "../chat/unreadChatStore";
import { InteractiveRating } from "../components/InteractiveRating";
import { Card } from "../components/Card";
import { PrimaryButton } from "../components/PrimaryButton";
import { absoluteUrl } from "../utils/url";
import { useAuth } from "../auth/AuthContext";

const GLASS_BG = colors.glassBg;
const GLASS_BORDER = colors.glassBorder;

type Props = {
  attentionRide: any | null;
  rideLoading: boolean;
  rideError: string | null;
  userHasActiveRide: boolean;
  userHasOpenOffer: boolean;
  offersRideId: string | null;
  offersRideLoading: boolean;
  offersRideCount: number;
  rideActionLoading: boolean;
  onNavigateMakeOffer: (serviceModeWanted: import("../rides/rides.types").ServiceMode) => void;
  onNavigateOfferLibre: () => void;
  onNavigateOffersWait: (rideId: string) => void;
  onNavigateHistory: () => void;
  onNavigateRideDetails: (rideId: string) => void;
  onNavigateChat: (rideId: string) => void;
  onCallDriverDirect: () => void;
  onCancelRide: () => void;
  onOpenProfile: () => void;
  onOpenSupport: () => void;
  onSubmitRating?: (stars: number) => void;
};

export function PassengerHomeView({
  attentionRide,
  rideLoading,
  rideError,
  userHasActiveRide,
  userHasOpenOffer,
  offersRideId,
  offersRideLoading,
  offersRideCount,
  rideActionLoading,
  onNavigateMakeOffer,
  onNavigateOfferLibre,
  onNavigateOffersWait,
  onNavigateHistory,
  onNavigateRideDetails,
  onNavigateChat,
  onCallDriverDirect,
  onCancelRide,
  onOpenProfile,
  onOpenSupport,
  onSubmitRating,
}: Props) {
  const auth = useAuth();
  const insets = useSafeAreaInsets();
  const unreadChatCount = useUnreadChatCount(attentionRide?.id);
  const [ratingStars, setRatingStars] = React.useState(5);
  const displayName = auth.user?.passenger?.fullName || auth.user?.username || "Usuario";

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: Math.max(insets.top + 8, 40) }]} showsVerticalScrollIndicator={false}>
        <GSHeader
          displayName={displayName}
          statusText="Pasajero"
          statusColor={colors.neon}
          onOpenProfile={onOpenProfile}
        />

        {/* Active Ride Section */}
        {attentionRide || rideLoading || rideError ? (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Tu servicio actual</Text>
              {rideLoading && <ActivityIndicator size="small" color={colors.neon} style={{ marginLeft: 8 }} />}
            </View>

            {rideError ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{rideError}</Text>
              </View>
            ) : null}

            {attentionRide ? (
              <View style={styles.activeCard}>
                <View style={styles.activeHeaderRow}>
                  <View style={styles.activeStatusBadge}>
                    <Ionicons name="flash" size={14} color="#000" />
                    <Text style={styles.activeStatusText}>
                      {rideStatusLabel({ status: attentionRide.status, role: "USER", canRate: false })}
                    </Text>
                  </View>
                  <Text style={styles.activePrice}>
                    {attentionRide.agreedPrice ? formatCop(Number(attentionRide.agreedPrice)) : ""}
                  </Text>
                </View>

                {attentionRide.matchedDriver ? (
                  <View style={styles.driverInfoRow}>
                    <View style={styles.driverAvatar}>
                      <Ionicons name="person" size={20} color="#fff" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.driverName}>{attentionRide.matchedDriver.fullName}</Text>
                      {attentionRide.matchedDriver.vehicle ? (
                        <Text style={styles.driverVehicle}>
                          {attentionRide.matchedDriver.vehicle.brand} {attentionRide.matchedDriver.vehicle.model} • {attentionRide.matchedDriver.vehicle.plate}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                ) : null}

                {/* Minimap & Locations */}
                {(() => {
                  const pLat = Number(attentionRide.pickupLat);
                  const pLng = Number(attentionRide.pickupLng);
                  const dLat = Number(attentionRide.dropoffLat);
                  const dLng = Number(attentionRide.dropoffLng);
                  const hasValidPickup = Number.isFinite(pLat) && Number.isFinite(pLng) && pLat !== 0;
                  const hasValidDropoff = Number.isFinite(dLat) && Number.isFinite(dLng) && dLat !== 0;

                  return (
                    <>
                      {hasValidPickup && hasValidDropoff ? (
                        <View style={{ height: 130, borderRadius: 12, overflow: "hidden", marginBottom: 12, borderWidth: 1, borderColor: GLASS_BORDER }}>
                          <MiniRouteMap
                            pickup={{ lat: pLat, lng: pLng }}
                            dropoff={{ lat: dLat, lng: dLng }}
                            routePath={attentionRide.routePath}
                            height={130}
                          />
                        </View>
                      ) : hasValidPickup ? (
                        <View style={{ height: 110, borderRadius: 12, overflow: "hidden", marginBottom: 12, borderWidth: 1, borderColor: GLASS_BORDER, pointerEvents: "none" }}>
                          <AppMap
                            style={StyleSheet.absoluteFill}
                            initialRegion={{
                              latitude: pLat,
                              longitude: pLng,
                              latitudeDelta: 0.02,
                              longitudeDelta: 0.02,
                            }}
                            markers={[
                              { id: "pickup", title: "A", coordinate: { latitude: pLat, longitude: pLng } }
                            ]}
                            pitchEnabled={false}
                            rotateEnabled={false}
                            scrollEnabled={false}
                            zoomEnabled={false}
                          />
                        </View>
                      ) : null}

                      <View style={{ gap: 6, marginBottom: 12 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.neon }} />
                          <Text style={{ color: "#fff", fontSize: 13, flex: 1 }} numberOfLines={1}>
                            <Text style={{ color: colors.mutedText, fontWeight: "bold" }}>Origen: </Text>
                            {attentionRide.pickupText || attentionRide.pickupAddress || "Punto de recogida"}
                          </Text>
                        </View>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#F44336" }} />
                          <Text style={{ color: "#fff", fontSize: 13, flex: 1 }} numberOfLines={1}>
                            <Text style={{ color: colors.mutedText, fontWeight: "bold" }}>Destino: </Text>
                            {attentionRide.dropoffText || attentionRide.dropoffAddress || "Destino"}
                          </Text>
                        </View>
                      </View>
                    </>
                  );
                })()}

                <View style={styles.activeActions}>
                  <Pressable style={[styles.actionBtn, { flex: 1 }]} onPress={() => onNavigateRideDetails(attentionRide.id)}>
                    <Ionicons name="list-outline" size={16} color={colors.neon} />
                    <Text style={styles.actionBtnText}>Detalles</Text>
                  </Pressable>

                  {attentionRide.matchedDriver && (attentionRide.status === "ASSIGNED" || attentionRide.status === "ACCEPTED" || attentionRide.status === "IN_PROGRESS") ? (
                    <>
                      <Pressable style={[styles.actionBtn, { flex: 1 }]} onPress={() => onNavigateChat(attentionRide.id)}>
                        <Ionicons name="chatbubbles" size={16} color={colors.neon} />
                        <Text style={styles.actionBtnText}>Chat</Text>
                        {unreadChatCount > 0 ? (
                          <View style={styles.unreadBadge}>
                            <Text style={styles.unreadBadgeText}>{unreadChatCount > 99 ? "99+" : unreadChatCount}</Text>
                          </View>
                        ) : null}
                      </Pressable>
                      <Pressable style={[styles.actionBtn, { flex: 0.5, justifyContent: "center" }]} onPress={onCallDriverDirect}>
                        <Ionicons name="call" size={16} color="#4CAF50" />
                      </Pressable>
                    </>
                  ) : null}
                </View>

                {(attentionRide.status === "OPEN" || attentionRide.status === "ASSIGNED" || attentionRide.status === "ACCEPTED" || attentionRide.status === "MATCHED") ? (
                  <Pressable
                    style={styles.cancelBtn}
                    onPress={onCancelRide}
                    disabled={rideActionLoading}
                  >
                    <Text style={styles.cancelBtnText}>{rideActionLoading ? "Cancelando..." : "Cancelar servicio"}</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Obligatory Rating Overlay when ride is COMPLETED */}
        {attentionRide && attentionRide.status === "COMPLETED" ? (
          <View style={styles.ratingOverlay}>
            <Card style={{ gap: 14, width: "100%", padding: 20 }}>
              <View style={{ alignItems: "center", gap: 6 }}>
                <Ionicons name="checkmark-circle" size={48} color="#4CAF50" />
                <Text style={{ color: "#fff", fontSize: 20, fontWeight: "900", textAlign: "center" }}>
                  ¡Servicio Finalizado!
                </Text>
                <Text style={{ color: colors.mutedText, fontSize: 13, textAlign: "center" }}>
                  Calificá a tu ejecutivo para completar el servicio y continuar.
                </Text>
              </View>

              {attentionRide.matchedDriver ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "rgba(0,0,0,0.4)", padding: 12, borderRadius: 14 }}>
                  {attentionRide.matchedDriver.photoUrl ? (
                    <Image source={{ uri: absoluteUrl(attentionRide.matchedDriver.photoUrl) || undefined }} style={{ width: 50, height: 50, borderRadius: 25 }} />
                  ) : (
                    <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" }}>
                      <Ionicons name="person" size={24} color={colors.neon} />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: "#fff", fontWeight: "900", fontSize: 15 }}>
                      {attentionRide.matchedDriver.fullName}
                    </Text>
                    {attentionRide.matchedDriver.vehicle ? (
                      <Text style={{ color: colors.mutedText, fontSize: 12 }}>
                        {attentionRide.matchedDriver.vehicle.brand} {attentionRide.matchedDriver.vehicle.model} • {attentionRide.matchedDriver.vehicle.plate}
                      </Text>
                    ) : null}
                  </View>
                </View>
              ) : null}

              <View style={{ alignItems: "center", gap: 10, marginVertical: 8 }}>
                <InteractiveRating
                  disabled={rideActionLoading}
                  onRatingSubmit={(stars: number) => {
                    setRatingStars(stars);
                    if (onSubmitRating) onSubmitRating(stars);
                  }}
                />
              </View>
            </Card>
          </View>
        ) : null}

        {/* Action Buttons Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>¿Qué necesitas hoy?</Text>
          </View>

          <View style={styles.servicesGrid}>
            <Pressable
              style={({ pressed }) => [styles.serviceBtn, pressed && styles.pressed, (userHasActiveRide || userHasOpenOffer) && styles.disabledBtn]}
              onPress={() => onNavigateMakeOffer("TRASLADO")}
              disabled={userHasActiveRide || userHasOpenOffer}
            >
              <View style={[styles.serviceIconWrap, { backgroundColor: colors.neonGlow }]}>
                <Ionicons name="car" size={28} color={colors.neon} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.serviceBtnTitle}>Solicitar Traslado</Text>
                <Text style={styles.serviceBtnSub}>Viaja cómodo y seguro</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={GLASS_BORDER} />
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.serviceBtn, pressed && styles.pressed, (userHasActiveRide || userHasOpenOffer) && styles.disabledBtn]}
              onPress={() => onNavigateMakeOffer("DELIVERY")}
              disabled={userHasActiveRide || userHasOpenOffer}
            >
              <View style={[styles.serviceIconWrap, { backgroundColor: "rgba(255,152,0,0.15)" }]}>
                <Ionicons name="cube" size={28} color="#FF9800" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.serviceBtnTitle}>Delivery</Text>
                <Text style={styles.serviceBtnSub}>Tus entregas rápidas</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={GLASS_BORDER} />
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.serviceBtn, pressed && styles.pressed, (userHasActiveRide || userHasOpenOffer) && styles.disabledBtn]}
              onPress={() => onNavigateMakeOffer("ENVIO")}
              disabled={userHasActiveRide || userHasOpenOffer}
            >
              <View style={[styles.serviceIconWrap, { backgroundColor: "rgba(76,175,80,0.15)" }]}>
                <Ionicons name="mail" size={28} color="#4CAF50" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.serviceBtnTitle}>Envíos</Text>
                <Text style={styles.serviceBtnSub}>Paquetes a su destino</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={GLASS_BORDER} />
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.serviceBtn, pressed && styles.pressed, (userHasActiveRide || userHasOpenOffer) && styles.disabledBtn, { marginTop: 16 }]}
              onPress={onNavigateOfferLibre}
              disabled={userHasActiveRide || userHasOpenOffer}
            >
              <View style={[styles.serviceIconWrap, { backgroundColor: "rgba(255,152,0,0.15)" }]}>
                <Ionicons name="cash" size={28} color="#FF9800" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.serviceBtnTitle}>Contraoferta</Text>
                <Text style={styles.serviceBtnSub}>Propon tu tarifa directamente</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={GLASS_BORDER} />
            </Pressable>
          </View>
        </View>

        {/* Offers Wait & History */}
        <View style={styles.sectionContainer}>
          <View style={styles.quickActions}>
            <Pressable
              style={({ pressed }) => [styles.quickActionBtn, pressed && styles.pressed, (!offersRideId || offersRideLoading) && styles.disabledBtn]}
              onPress={() => {
                if (offersRideId) onNavigateOffersWait(offersRideId);
              }}
              disabled={!offersRideId || offersRideLoading}
            >
              <Ionicons name="people" size={20} color={offersRideId ? colors.neon : colors.mutedText} />
              <View style={{ marginLeft: 10 }}>
                <Text style={styles.actionTitle}>Ejecutivos Ofrecidos</Text>
                <Text style={styles.actionSub}>
                  {offersRideId ? (offersRideLoading ? `Buscando...` : `${offersRideCount} ofertas recibidas`) : "Sin solicitudes activas"}
                </Text>
              </View>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.quickActionBtn, pressed && styles.pressed]}
              onPress={onNavigateHistory}
            >
              <Ionicons name="time" size={20} color="#fff" />
              <View style={{ marginLeft: 10 }}>
                <Text style={styles.actionTitle}>Historial</Text>
                <Text style={styles.actionSub}>Tus viajes anteriores</Text>
              </View>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {/* Floating Support Button */}
      <Pressable style={styles.fabSupport} onPress={onOpenSupport}>
        <Ionicons name="headset" size={24} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  bgGlow: {
    position: "absolute",
    top: -100,
    left: -50,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: colors.neonGlow,
    transform: [{ scaleX: 2 }],
    opacity: 0.8,
  },
  profileBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: GLASS_BG,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  errorBox: {
    backgroundColor: "rgba(244, 67, 54, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(244, 67, 54, 0.3)",
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  errorText: {
    color: "#F44336",
    fontSize: 12,
  },
  activeCard: {
    backgroundColor: GLASS_BG,
    borderWidth: 1,
    borderColor: colors.neon,
    borderRadius: 16,
    padding: 16,
    shadowColor: colors.neon,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  activeHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  activeStatusBadge: {
    backgroundColor: colors.neon,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  activeStatusText: {
    color: "#000",
    fontWeight: "900",
    fontSize: 11,
  },
  activePrice: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 18,
  },
  driverInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
    backgroundColor: "rgba(0,0,0,0.2)",
    padding: 12,
    borderRadius: 12,
  },
  driverAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#333",
    alignItems: "center",
    justifyContent: "center",
  },
  driverName: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
  driverVehicle: {
    color: "#aaa",
    fontSize: 12,
    marginTop: 2,
  },
  activeActions: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  actionBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  unreadBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "#F44336",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#000000",
    elevation: 6,
    zIndex: 10,
  },
  unreadBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
  },
  cancelBtn: {
    backgroundColor: "rgba(244, 67, 54, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(244, 67, 54, 0.5)",
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
  },
  cancelBtnText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: "900",
  },
  ratingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.85)",
    zIndex: 100,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  servicesGrid: {
    gap: 12,
  },
  serviceBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: GLASS_BG,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    borderRadius: 16,
    padding: 16,
  },
  serviceIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  serviceBtnTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  serviceBtnSub: {
    color: "#aaa",
    fontSize: 12,
    marginTop: 2,
  },
  quickActions: {
    gap: 12,
  },
  quickActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: GLASS_BG,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    borderRadius: 16,
    padding: 16,
  },
  actionTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  actionSub: {
    color: "#aaa",
    fontSize: 11,
    marginTop: 2,
  },
  fabSupport: {
    position: "absolute",
    bottom: 30,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
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
  pressed: {
    opacity: 0.7,
  },
  disabledBtn: {
    opacity: 0.5,
  }
});
