import { View, StyleSheet, ScrollView, Text, Image, Pressable, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../auth/AuthContext";
import { colors } from "../theme/colors";
import { formatCop } from "../utils/currency";
import { AppMap, type AppMapMarker, type Region } from "../components/AppMap";
import { MiniRouteMap } from "../components/MiniRouteMap";
import { openPhoneCall, openWhatsappMessage } from "../utils/phone";
import { absoluteUrl } from "../utils/url";
import { useUnreadChatCount } from "../chat/unreadChatStore";

const GLASS_BG = colors.glassBg;
const GLASS_BORDER = colors.glassBorder;

interface DriverHomeViewProps {
  attentionRide: any;
  nearbyRequests: any[];
  completedRides: number;
  rating: number;
  earnings: number;
  balance: number;
  onNavigateOfferDetails: (rideId: string) => void;
  onRefresh: () => void;
  onOpenHistory: () => void;
  onOpenBalance: () => void;
  onOpenAvailable: () => void;
  onOpenSupport: () => void;
  onOpenProfile: () => void;
  onDriverAction?: (action: "accept" | "start" | "complete") => void;
  onNotifyArrived?: () => void;
  onNavigateRideDetails?: (rideId: string) => void;
  onNavigateChat?: (rideId: string) => void;
  rideActionLoading?: boolean;
}

export function DriverHomeView({
  attentionRide,
  nearbyRequests,
  completedRides,
  rating,
  earnings,
  balance,
  onNavigateOfferDetails,
  onRefresh,
  onOpenHistory,
  onOpenBalance,
  onOpenAvailable,
  onOpenSupport,
  onOpenProfile,
  onDriverAction,
  onNotifyArrived,
  onNavigateRideDetails,
  onNavigateChat,
  rideActionLoading,
}: DriverHomeViewProps) {
  const auth = useAuth();
  const insets = useSafeAreaInsets();
  const displayName = auth.user?.username || auth.user?.email?.split("@")[0] || "Ejecutivo";

  const renderActiveService = () => {
    const activeStatuses = ["ASSIGNED", "MATCHED", "ACCEPTED", "ARRIVED", "IN_PROGRESS"];
    if (!attentionRide || !activeStatuses.includes(attentionRide.status)) return null;

    const rideId = String(attentionRide.id);
    const unreadCount = useUnreadChatCount(rideId);
    const shortId = rideId.slice(-6);
    const serviceType = attentionRide.serviceType || attentionRide.serviceTypeWanted || "TRASLADO";
    const status = attentionRide.status;

    let statusLabel = "Pasajero Asignado";
    let statusColor = "#2196F3"; // Azul por defecto
    if (status === "ARRIVED") {
      statusLabel = "En el punto de origen";
      statusColor = "#FF9800"; // Naranja
    } else if (status === "IN_PROGRESS") {
      statusLabel = "Viaje en curso";
      statusColor = colors.neon; // Neon
    }

    const pLat = Number(attentionRide.pickupLat);
    const pLng = Number(attentionRide.pickupLng);
    const dLat = Number(attentionRide.dropoffLat);
    const dLng = Number(attentionRide.dropoffLng);
    const hasValidPickup = Number.isFinite(pLat) && Number.isFinite(pLng) && pLat !== 0;
    const hasValidDropoff = Number.isFinite(dLat) && Number.isFinite(dLng) && dLat !== 0;

    const pickupAddr = attentionRide.pickupText || attentionRide.pickupAddress || "Origen";
    const dropoffAddr = attentionRide.dropoffText || attentionRide.dropoffAddress || "Destino";
    const rawPrice = attentionRide.agreedPrice || attentionRide.estimatedPrice || 0;
    const priceDisplay = formatCop(Number(rawPrice));

    const passengerName = attentionRide.passenger?.fullName || `${attentionRide.passenger?.firstName || ""} ${attentionRide.passenger?.lastName || ""}`.trim() || "Cliente";
    const passengerPhone = attentionRide.passenger?.phone;
    const passengerPhoto = absoluteUrl(attentionRide.passenger?.photoUrl);

    return (
      <View style={styles.activeServiceCard}>
        <View style={styles.activeServiceHeader}>
          <Text style={styles.activeServiceTitle}>Servicio Activo</Text>
          <View style={[styles.activeBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.activeBadgeText}>{statusLabel}</Text>
          </View>
          <View style={{ flex: 1 }} />
          {onNavigateRideDetails ? (
            <Pressable onPress={() => onNavigateRideDetails(rideId)}>
              <Text style={styles.detailsLink}>Ver detalles &gt;</Text>
            </Pressable>
          ) : null}
        </View>

        {/* Map Area */}
        {hasValidPickup && hasValidDropoff ? (
          <View style={styles.activeServiceMapWrap}>
            <MiniRouteMap
              pickup={{ lat: pLat, lng: pLng }}
              dropoff={{ lat: dLat, lng: dLng }}
              routePath={attentionRide.routePath}
              height={140}
            />
          </View>
        ) : null}

        {/* Passenger Row */}
        <View style={styles.passengerCardRow}>
          {passengerPhoto ? (
            <Image source={{ uri: passengerPhoto }} style={styles.passengerAvatar} resizeMode="cover" />
          ) : (
            <View style={styles.passengerAvatarFallback}>
              <Ionicons name="person" size={18} color={colors.neon} />
            </View>
          )}
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.passengerNameText} numberOfLines={1}>{passengerName}</Text>
            {passengerPhone ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: 2 }}>
                <Text style={styles.passengerPhoneText}>Tel: {passengerPhone}</Text>
                <Pressable style={styles.phoneBadge} onPress={() => openPhoneCall(passengerPhone)}>
                  <Ionicons name="call" size={12} color="#fff" />
                  <Text style={styles.badgeText}>Llamar</Text>
                </Pressable>
                <Pressable style={styles.whatsappBadge} onPress={() => openWhatsappMessage(passengerPhone)}>
                  <Ionicons name="logo-whatsapp" size={12} color="#fff" />
                  <Text style={styles.badgeText}>WhatsApp</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
          <Text style={styles.activePriceText}>{priceDisplay}</Text>
        </View>

        {/* Location Addresses */}
        <View style={{ gap: 6, marginVertical: 8 }}>
          <View style={styles.locationRow}>
            <View style={styles.dotGreenSmall} />
            <Text style={styles.locationText} numberOfLines={1}>
              <Text style={{ color: colors.neon, fontWeight: "bold" }}>Origen: </Text>{pickupAddr}
            </Text>
          </View>
          <View style={styles.locationRow}>
            <View style={styles.dotRedSmall} />
            <Text style={styles.locationText} numberOfLines={1}>
              <Text style={{ color: "#F44336", fontWeight: "bold" }}>Destino: </Text>{dropoffAddr}
            </Text>
          </View>
        </View>

        {/* Executive Flow Action Buttons */}
        <View style={styles.activeFlowBtnRow}>
          {status !== "IN_PROGRESS" && onNotifyArrived ? (
            <Pressable
              style={styles.notifyArrivedBtn}
              onPress={() => onNotifyArrived()}
              disabled={rideActionLoading}
            >
              <Ionicons name="location" size={16} color="#FFFFFF" />
              <Text style={styles.notifyArrivedBtnText}>Llegué al Origen</Text>
            </Pressable>
          ) : null}

          {status !== "IN_PROGRESS" && onDriverAction ? (
            <Pressable
              style={styles.startRideBtn}
              onPress={() => onDriverAction("start")}
              disabled={rideActionLoading}
            >
              <Ionicons name="play" size={16} color="#000000" />
              <Text style={styles.startRideBtnText}>Iniciar Viaje</Text>
            </Pressable>
          ) : null}

          {status === "IN_PROGRESS" && onDriverAction ? (
            <Pressable
              style={styles.completeRideBtn}
              onPress={() => onDriverAction("complete")}
              disabled={rideActionLoading}
            >
              <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
              <Text style={styles.completeRideBtnText}>Finalizar Servicio</Text>
            </Pressable>
          ) : null}

          {onNavigateChat ? (
            <Pressable
              style={styles.chatIconBtn}
              onPress={() => onNavigateChat(rideId)}
            >
              <Ionicons name="chatbubbles" size={18} color={colors.neon} />
              {unreadCount > 0 ? (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadBadgeText}>{unreadCount > 99 ? "99+" : unreadCount}</Text>
                </View>
              ) : null}
            </Pressable>
          ) : null}
        </View>
      </View>
    );
  };

  const renderRequestedServices = () => {
    return (
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Servicios solicitados</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{nearbyRequests.length}</Text>
          </View>
          <View style={{ flex: 1 }} />
          <Pressable onPress={onRefresh}>
            <Text style={styles.detailsLink}>Actualizar</Text>
          </Pressable>
        </View>

        {nearbyRequests.map((req, idx) => {
          const rideId = String(req.rideId || req.id || req.ride?.id || "");
          const serviceType = req.serviceTypeWanted || req.serviceType || req.ride?.serviceTypeWanted || req.ride?.serviceType || "TRASLADO";
          const isOffer = req.type === "OFFER" || req.status === "OFFERED" || req.ride?.status === "OFFERED" || req.myOffer?.status === "OFFERED";
          
          let icon = "car";
          let color = "#FF9800"; // Traslado default
          if (serviceType === "DELIVERY") { icon = "cube"; color = "#4CAF50"; }
          if (serviceType === "ENVIO") { icon = "cube"; color = "#2196F3"; }
          if (isOffer) { icon = "hand-right"; color = "#9C27B0"; }

          const pLat = Number(req.pickup?.lat ?? req.pickupLat ?? req.ride?.pickupLat);
          const pLng = Number(req.pickup?.lng ?? req.pickupLng ?? req.ride?.pickupLng);
          const dLat = Number(req.dropoff?.lat ?? req.dropoffLat ?? req.ride?.dropoffLat);
          const dLng = Number(req.dropoff?.lng ?? req.dropoffLng ?? req.ride?.dropoffLng);
          const hasValidPickup = Number.isFinite(pLat) && Number.isFinite(pLng) && pLat !== 0;
          const hasValidDropoff = Number.isFinite(dLat) && Number.isFinite(dLng) && dLat !== 0;

          const pickupAddr = req.pickup?.address || req.pickupAddress || req.pickupText || req.ride?.pickupAddress || req.ride?.pickupText || "Origen";
          const dropoffAddr = req.dropoff?.address || req.dropoffAddress || req.dropoffText || req.ride?.dropoffAddress || req.ride?.dropoffText || "Destino";
          const rawPrice = req.estimatedPrice ?? req.agreedPrice ?? req.ride?.estimatedPrice ?? req.ride?.agreedPrice ?? 0;
          const priceDisplay = formatCop(Number(rawPrice));

          return (
            <Pressable key={rideId || idx} style={styles.requestCard} onPress={() => rideId && onNavigateOfferDetails(rideId)}>
              {/* Full Width Top Minimap */}
              <View style={styles.requestMapThumbFull}>
                {hasValidPickup && hasValidDropoff ? (
                  <View style={{ width: "100%", height: "100%", pointerEvents: "none" }}>
                    <MiniRouteMap
                      pickup={{ lat: pLat, lng: pLng }}
                      dropoff={{ lat: dLat, lng: dLng }}
                      height={130}
                    />
                  </View>
                ) : hasValidPickup ? (
                  <View style={{ width: "100%", height: "100%", pointerEvents: "none" }}>
                    <AppMap
                      style={{ width: "100%", height: "100%" }}
                      initialRegion={{
                        latitude: pLat,
                        longitude: pLng,
                        latitudeDelta: 0.015,
                        longitudeDelta: 0.015,
                      }}
                      markers={[
                        { id: "pickup", title: "A", coordinate: { latitude: pLat, longitude: pLng } },
                      ]}
                      pitchEnabled={false}
                      rotateEnabled={false}
                      scrollEnabled={false}
                      zoomEnabled={false}
                    />
                  </View>
                ) : (
                  <View style={{ width: "100%", height: "100%", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.5)" }}>
                    <Ionicons name="map" size={32} color={GLASS_BORDER} />
                  </View>
                )}
              </View>
              
              <View style={styles.requestCardBody}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <View style={styles.reqTypeRow}>
                    <Ionicons name={icon as any} size={16} color={color} />
                    <Text style={[styles.reqType, { color, fontSize: 13 }]}>
                      {isOffer ? "Contraoferta" : serviceType}
                    </Text>
                  </View>
                  <Text style={styles.reqPrice}>{priceDisplay}</Text>
                </View>
                
                <View style={{ gap: 4, marginVertical: 4 }}>
                  <View style={styles.locationRow}>
                    <View style={[styles.dotGreenSmall, { backgroundColor: color }]} />
                    <Text style={styles.locationText} numberOfLines={1}>
                      <Text style={{ color: color, fontWeight: "bold" }}>Origen: </Text>{pickupAddr}
                    </Text>
                  </View>
                  <View style={styles.locationRow}>
                    <View style={styles.dotRedSmall} />
                    <Text style={styles.locationText} numberOfLines={1}>
                      <Text style={{ color: "#F44336", fontWeight: "bold" }}>Destino: </Text>{dropoffAddr}
                    </Text>
                  </View>
                </View>

                <View style={{ alignItems: "flex-end", marginTop: 4 }}>
                  <Pressable
                    style={[styles.acceptBtn, isOffer && { backgroundColor: "rgba(255,255,255,0.15)", borderColor: GLASS_BORDER }]}
                    onPress={() => rideId && onNavigateOfferDetails(rideId)}
                    disabled={isOffer}
                  >
                    <Text style={[styles.acceptBtnText, isOffer && { color: colors.mutedText }]}>
                      {isOffer ? "Postulado" : "Postularme"}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </Pressable>
          );
        })}

        {nearbyRequests.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={40} color={GLASS_BORDER} />
            <Text style={styles.emptyText}>Buscando servicios cercanos...</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: Math.max(insets.top + 8, 40) }]} showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Image
              source={require("../../assets/icon.png")}
              style={{ width: 34, height: 34, marginRight: 4 }}
              resizeMode="contain"
            />
            <View>
              <Text style={styles.greeting}>¡Hola, {displayName}!</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Text style={styles.statusText}>Conectado y disponible</Text>
                <View style={styles.statusDot} />
              </View>
            </View>
          </View>

          <View style={styles.headerRight}>
            <Pressable style={styles.notifBtn}>
              <Ionicons name="notifications-outline" size={24} color="#fff" />
              {(() => {
                const hasActiveService = attentionRide && (attentionRide.status === "IN_PROGRESS" || attentionRide.status === "ACCEPTED");
                const count = (nearbyRequests ? nearbyRequests.length : 0) + (hasActiveService ? 1 : 0);
                if (count > 0) {
                  return (
                    <View style={styles.notifBadge}>
                      <Text style={styles.notifBadgeText}>{count}</Text>
                    </View>
                  );
                }
                return null;
              })()}
            </Pressable>
            <Pressable style={styles.profileBtn} onPress={onOpenProfile}>
              <Ionicons name="person-circle-outline" size={28} color={colors.neon} />
            </Pressable>
          </View>
        </View>

        {/* Status Banner */}
        <LinearGradient
          colors={["#292100", "#473A00", "#1C1600"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.banner}
        >
          <View style={styles.bannerContent}>
            <Text style={styles.bannerSubtitle}>Estado actual</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}>
              <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
              <Text style={styles.bannerTitle}>Disponible</Text>
            </View>
            <Text style={styles.bannerText}>Listo para recibir servicios</Text>
          </View>
          <Image 
            source={require("../../assets/asset-1.png")} 
            style={styles.bannerImage} 
            resizeMode="contain" 
          />
          <Pressable style={styles.bannerArrow}>
            <Ionicons name="chevron-forward" size={16} color="#fff" />
          </Pressable>
        </LinearGradient>

        {/* Metrics Grid */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <View style={[styles.iconWrap, { backgroundColor: "rgba(156,39,176,0.1)" }]}>
              <Ionicons name="briefcase-outline" size={20} color="#9C27B0" />
            </View>
            <Text style={styles.metricValue}>{completedRides}</Text>
            <Text style={styles.metricLabel}>Servicios completados</Text>
          </View>
          <View style={styles.metricCard}>
            <View style={[styles.iconWrap, { backgroundColor: "rgba(255,152,0,0.1)" }]}>
              <Ionicons name="star-outline" size={20} color="#FF9800" />
            </View>
            <Text style={styles.metricValue}>{rating.toFixed(1)}</Text>
            <Text style={styles.metricLabel}>Calificación</Text>
          </View>
          <View style={styles.metricCard}>
            <View style={[styles.iconWrap, { backgroundColor: "rgba(76,175,80,0.1)" }]}>
              <Ionicons name="cash-outline" size={20} color="#4CAF50" />
            </View>
            <Text style={styles.metricValue}>{formatCop(earnings)}</Text>
            <Text style={styles.metricLabel}>Ganancias hoy</Text>
          </View>
          <View style={styles.metricCard}>
            <View style={[styles.iconWrap, { backgroundColor: "rgba(33,150,243,0.1)" }]}>
              <Ionicons name="time-outline" size={20} color="#2196F3" />
            </View>
            <Text style={styles.metricValue}>--</Text>
            <Text style={styles.metricLabel}>Tiempo activo</Text>
          </View>
        </View>

        {renderActiveService()}
        {renderRequestedServices()}

        {/* Quick Actions Footer */}
        <View style={styles.quickActions}>
          <Pressable style={styles.actionBtn} onPress={onOpenAvailable}>
            <Ionicons name="people-outline" size={20} color={colors.neon} />
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={styles.actionTitle}>Ejecutivos disponibles</Text>
            </View>
            <View style={[styles.countBadge, { backgroundColor: "rgba(76,175,80,0.2)" }]}>
              <Text style={[styles.countText, { color: "#4CAF50" }]}>24</Text>
            </View>
          </Pressable>

          <Pressable style={styles.actionBtn} onPress={onOpenHistory}>
            <Ionicons name="clipboard-outline" size={20} color={colors.neon} />
            <Text style={[styles.actionTitle, { flex: 1, marginLeft: 8 }]}>Mi historial</Text>
          </Pressable>

          <Pressable style={styles.actionBtn} onPress={onOpenBalance}>
            <Ionicons name="wallet-outline" size={20} color={colors.neon} />
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={styles.actionTitle}>Saldo disponible</Text>
              <Text style={styles.actionSub}>{formatCop(balance)}</Text>
            </View>
          </Pressable>
        </View>
        
        {/* Padding for bottom nav */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Floating Headset Button */}
      <Pressable style={styles.fabSupport} onPress={onOpenSupport}>
        <Ionicons name="headset" size={28} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollContent: {
    padding: 16,
    paddingTop: Platform.OS === "ios" ? 60 : 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
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
  menuBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: GLASS_BG,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    alignItems: "center",
    justifyContent: "center",
  },
  profileInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 2,
    borderColor: colors.neon,
    alignItems: "center",
    justifyContent: "center",
  },
  greeting: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  statusText: {
    color: "#aaa",
    fontSize: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#4CAF50",
  },
  notifBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: GLASS_BG,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    alignItems: "center",
    justifyContent: "center",
  },
  notifBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#F44336",
    borderRadius: 10,
    width: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  notifBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
  banner: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    flexDirection: "row",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  bannerContent: {
    flex: 1,
    zIndex: 2,
  },
  bannerSubtitle: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
  },
  bannerTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "900",
  },
  bannerText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    marginTop: 4,
  },
  bannerImage: {
    position: "absolute",
    right: -20,
    bottom: -10,
    width: 160,
    height: 100,
    zIndex: 1,
  },
  bannerArrow: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.3)",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    zIndex: 2,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
  },
  metricCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: GLASS_BG,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  metricValue: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 2,
  },
  metricLabel: {
    color: "#aaa",
    fontSize: 11,
    textAlign: "center",
  },
  activeServiceCard: {
    backgroundColor: GLASS_BG,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    borderRadius: 20,
    padding: 16,
    marginBottom: 24,
  },
  activeServiceHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  activeServiceTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginRight: 8,
  },
  activeBadge: {
    backgroundColor: "rgba(244,67,54,0.15)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeBadgeText: {
    color: "#F44336",
    fontSize: 10,
    fontWeight: "bold",
  },
  detailsLink: {
    color: colors.neon,
    fontSize: 12,
  },
  dummyMapArea: {
    height: 80,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 12,
    marginBottom: 16,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  routeLine: {
    flexDirection: "row",
    alignItems: "center",
    width: "80%",
  },
  linePulse: {
    flex: 1,
    height: 2,
    backgroundColor: colors.neon,
    opacity: 0.5,
  },
  dotGreen: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#4CAF50",
    shadowColor: "#4CAF50",
    shadowRadius: 5,
    shadowOpacity: 0.8,
  },
  dotRed: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#F44336",
    shadowColor: "#F44336",
    shadowRadius: 5,
    shadowOpacity: 0.8,
  },
  activeServiceBody: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  serviceIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.neonGlow,
    borderWidth: 1,
    borderColor: colors.neon,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    color: colors.neon,
    fontSize: 16,
    fontWeight: "bold",
  },
  serviceSub: {
    color: "#aaa",
    fontSize: 12,
    marginBottom: 6,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  dotGreenSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#4CAF50",
    marginRight: 6,
  },
  dotRedSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#F44336",
    marginRight: 6,
  },
  locationText: {
    color: "#ccc",
    fontSize: 12,
    flex: 1,
  },
  serviceAction: {
    alignItems: "flex-end",
  },
  priceBox: {
    alignItems: "flex-end",
    marginBottom: 4,
  },
  priceText: {
    color: "#4CAF50",
    fontSize: 16,
    fontWeight: "bold",
  },
  priceLabel: {
    color: "#aaa",
    fontSize: 10,
  },
  timeBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 8,
  },
  timeText: {
    color: "#aaa",
    fontSize: 12,
  },
  navigateBtn: {
    backgroundColor: colors.neon,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 4,
  },
  navigateBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  progressLabel: {
    color: "#aaa",
    fontSize: 10,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 2,
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.neon,
    borderRadius: 2,
  },
  progressPct: {
    color: "#fff",
    fontSize: 10,
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
    marginRight: 8,
  },
  countBadge: {
    backgroundColor: colors.neonGlow,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  countText: {
    color: colors.neon,
    fontSize: 10,
    fontWeight: "bold",
  },
  requestCard: {
    flexDirection: "column",
    backgroundColor: GLASS_BG,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 16,
  },
  requestMapThumbFull: {
    width: "100%",
    height: 130,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  requestCardBody: {
    padding: 12,
    gap: 6,
  },
  requestInfo: {
    flex: 1,
  },
  reqTypeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  reqType: {
    fontSize: 12,
    fontWeight: "bold",
  },
  requestAction: {
    alignItems: "flex-end",
  },
  reqPrice: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  reqDist: {
    color: "#aaa",
    fontSize: 10,
  },
  reqTime: {
    color: "#F44336",
    fontSize: 10,
    marginBottom: 4,
  },
  acceptBtn: {
    backgroundColor: "#382D00",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.neon,
  },
  acceptBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  emptyState: {
    padding: 30,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: GLASS_BG,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
  },
  emptyText: {
    color: "#aaa",
    marginTop: 10,
    fontSize: 12,
  },
  quickActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    minWidth: "45%",
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
    fontSize: 12,
    fontWeight: "bold",
  },
  actionSub: {
    color: "#4CAF50",
    fontSize: 10,
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
  activeServiceMapWrap: {
    width: "100%",
    borderRadius: 12,
    overflow: "hidden",
    marginVertical: 8,
  },
  passengerCardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(0,0,0,0.3)",
    padding: 10,
    borderRadius: 12,
    marginTop: 6,
  },
  passengerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  passengerAvatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  passengerNameText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
  passengerPhoneText: {
    color: colors.mutedText,
    fontSize: 12,
  },
  activePriceText: {
    color: colors.neon,
    fontSize: 16,
    fontWeight: "900",
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
  activeFlowBtnRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
  },
  notifyArrivedBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#FF9800",
    paddingVertical: 10,
    borderRadius: 12,
  },
  notifyArrivedBtnText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 13,
  },
  startRideBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.neon,
    paddingVertical: 10,
    borderRadius: 12,
  },
  startRideBtnText: {
    color: "#000000",
    fontWeight: "900",
    fontSize: 13,
  },
  completeRideBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#4CAF50",
    paddingVertical: 12,
    borderRadius: 12,
  },
  completeRideBtnText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 14,
  },
  chatIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    backgroundColor: GLASS_BG,
    alignItems: "center",
    justifyContent: "center",
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
});
