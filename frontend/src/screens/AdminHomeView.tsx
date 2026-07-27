import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GSHeader } from "../components/GSHeader";
import { colors } from "../theme/colors";
import { useAuth } from "../auth/AuthContext";

const GLASS_BG = colors.glassBg;
const GLASS_BORDER = colors.glassBorder;

type Props = {
  onNavigateSettings: () => void;
  onNavigateZones: () => void;
  onNavigateDrivers: () => void;
  onNavigatePassengers: () => void;
  onNavigateRides: () => void;
  onNavigatePasswordResets: () => void;
  onOpenProfile: () => void;
  onLogout: () => void;
};

export function AdminHomeView({
  onNavigateSettings,
  onNavigateZones,
  onNavigateDrivers,
  onNavigatePassengers,
  onNavigateRides,
  onNavigatePasswordResets,
  onOpenProfile,
  onLogout,
}: Props) {
  const auth = useAuth();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: Math.max(insets.top + 8, 40) }]} showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <GSHeader
          displayName="Administrador"
          statusText={auth.user?.email || "Admin"}
          statusColor="#E91E63"
          onOpenProfile={onOpenProfile}
        />

        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Gestión Principal</Text>
          </View>

          <View style={styles.grid}>
            <Pressable style={({ pressed }) => [styles.gridItem, pressed && styles.pressed]} onPress={onNavigateSettings}>
              <View style={[styles.iconWrap, { backgroundColor: colors.neonGlow }]}>
                <Ionicons name="settings" size={24} color={colors.neon} />
              </View>
              <Text style={styles.gridItemTitle}>Ajustes</Text>
              <Text style={styles.gridItemSub}>App & Tarifas</Text>
            </Pressable>

            <Pressable style={({ pressed }) => [styles.gridItem, pressed && styles.pressed]} onPress={onNavigateZones}>
              <View style={[styles.iconWrap, { backgroundColor: "rgba(76,175,80,0.15)" }]}>
                <Ionicons name="map" size={24} color="#4CAF50" />
              </View>
              <Text style={styles.gridItemTitle}>Zonas</Text>
              <Text style={styles.gridItemSub}>Geocercas</Text>
            </Pressable>
          </View>

          <View style={styles.grid}>
            <Pressable style={({ pressed }) => [styles.gridItem, pressed && styles.pressed]} onPress={onNavigateDrivers}>
              <View style={[styles.iconWrap, { backgroundColor: "rgba(255,152,0,0.15)" }]}>
                <Ionicons name="car" size={24} color="#FF9800" />
              </View>
              <Text style={styles.gridItemTitle}>Ejecutivos</Text>
              <Text style={styles.gridItemSub}>Verificados</Text>
            </Pressable>

            <Pressable style={({ pressed }) => [styles.gridItem, pressed && styles.pressed]} onPress={onNavigatePassengers}>
              <View style={[styles.iconWrap, { backgroundColor: "rgba(156,39,176,0.15)" }]}>
                <Ionicons name="people" size={24} color="#9C27B0" />
              </View>
              <Text style={styles.gridItemTitle}>Clientes</Text>
              <Text style={styles.gridItemSub}>Usuarios</Text>
            </Pressable>
          </View>

          <View style={styles.grid}>
            <Pressable style={({ pressed }) => [styles.gridItem, pressed && styles.pressed]} onPress={onNavigateRides}>
              <View style={[styles.iconWrap, { backgroundColor: "rgba(33,150,243,0.15)" }]}>
                <Ionicons name="navigate" size={24} color="#2196F3" />
              </View>
              <Text style={styles.gridItemTitle}>Viajes</Text>
              <Text style={styles.gridItemSub}>Historial total</Text>
            </Pressable>

            <Pressable style={({ pressed }) => [styles.gridItem, pressed && styles.pressed]} onPress={onNavigatePasswordResets}>
              <View style={[styles.iconWrap, { backgroundColor: "rgba(244,67,54,0.15)" }]}>
                <Ionicons name="key" size={24} color="#F44336" />
              </View>
              <Text style={styles.gridItemTitle}>Recuperaciones</Text>
              <Text style={styles.gridItemSub}>Contraseñas</Text>
            </Pressable>
          </View>
        </View>

      </ScrollView>
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
    top: -50,
    right: -100,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: colors.neonGlow,
    transform: [{ scaleX: 1.5 }],
    opacity: 0.8,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  sectionContainer: {
    marginTop: 10,
  },
  sectionHeader: {
    marginBottom: 20,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  grid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  gridItem: {
    flex: 1,
    backgroundColor: GLASS_BG,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    borderRadius: 16,
    padding: 16,
    alignItems: "flex-start",
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  gridItemTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "bold",
  },
  gridItemSub: {
    color: "#aaa",
    fontSize: 11,
    marginTop: 4,
  },
  pressed: {
    opacity: 0.7,
  }
});
