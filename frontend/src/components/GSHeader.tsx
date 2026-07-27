import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/colors";

const GLASS_BG = colors.glassBg;
const GLASS_BORDER = colors.glassBorder;

interface GSHeaderProps {
  displayName: string;
  statusText?: string;
  statusColor?: string;
  onOpenProfile?: () => void;
  notificationCount?: number;
}

export function GSHeader({
  displayName,
  statusText = "Conectado",
  statusColor = "#4CAF50",
  onOpenProfile,
  notificationCount = 0,
}: GSHeaderProps) {
  return (
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
            <Text style={styles.statusText}>{statusText}</Text>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          </View>
        </View>
      </View>

      <View style={styles.headerRight}>
        <Pressable style={styles.notifBtn}>
          <Ionicons name="notifications-outline" size={24} color="#fff" />
          {notificationCount > 0 ? (
            <View style={styles.notifBadge}>
              <Text style={styles.notifBadgeText}>{notificationCount}</Text>
            </View>
          ) : null}
        </Pressable>
        {onOpenProfile && (
          <Pressable style={styles.profileBtn} onPress={onOpenProfile}>
            <Ionicons name="person-circle-outline" size={28} color={colors.neon} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
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
});
