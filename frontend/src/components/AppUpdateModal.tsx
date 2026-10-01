import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { colors } from "../theme/colors";
import type { AppVersionInfo } from "../config/config.api";

export function getCurrentBuildNumber(): number {
  const nativeBuild = Number(Constants.nativeBuildVersion);
  if (Number.isFinite(nativeBuild) && nativeBuild > 0) return nativeBuild;

  if (Platform.OS === "ios") {
    const raw = Number(Constants.expoConfig?.ios?.buildNumber);
    if (Number.isFinite(raw) && raw > 0) return raw;
  } else {
    const raw = Number(Constants.expoConfig?.android?.versionCode);
    if (Number.isFinite(raw) && raw > 0) return raw;
  }
  return 0;
}

export function getCurrentVersionName(): string {
  return Constants.nativeAppVersion || Constants.expoConfig?.version || "1.0.0";
}

function isOlderVersion(current: string, target: string): boolean {
  try {
    const cParts = current.split(".").map((p) => parseInt(p, 10) || 0);
    const tParts = target.split(".").map((p) => parseInt(p, 10) || 0);
    for (let i = 0; i < Math.max(cParts.length, tParts.length); i++) {
      const c = cParts[i] || 0;
      const t = tParts[i] || 0;
      if (c < t) return true;
      if (c > t) return false;
    }
  } catch {}
  return false;
}

interface AppUpdateModalProps {
  versionInfo?: AppVersionInfo | null;
}

export function AppUpdateModal({ versionInfo }: AppUpdateModalProps) {
  const [dismissed, setDismissed] = useState(false);

  if (!versionInfo) return null;

  const isExpoGo =
    (Constants as any)?.executionEnvironment === "storeClient" ||
    (Constants as any)?.appOwnership === "expo";

  // En entorno Expo Go de desarrollo local no bloqueamos para permitir depurar
  if (isExpoGo) return null;

  const currentBuild = getCurrentBuildNumber();
  const currentVersion = getCurrentVersionName();

  const minBuild =
    Platform.OS === "ios"
      ? Number(versionInfo.minIosBuildNumber || 0)
      : Number(versionInfo.minAndroidBuildNumber || 0);

  const buildIsOlder = currentBuild > 0 && minBuild > 0 && currentBuild < minBuild;
  const semverIsOlder =
    Boolean(versionInfo.latestVersion) &&
    isOlderVersion(currentVersion, versionInfo.latestVersion);

  const needsUpdate = buildIsOlder || semverIsOlder;

  if (!needsUpdate) return null;
  if (dismissed && !versionInfo.forceUpdate) return null;

  const storeUrl =
    Platform.OS === "ios"
      ? versionInfo.appStoreUrl || "https://apps.apple.com/app/id6744026367"
      : versionInfo.playStoreUrl || "https://play.google.com/store/apps/details?id=com.xpress.sc";

  const storeLabel =
    Platform.OS === "ios" ? "Actualizar en App Store" : "Actualizar en Google Play";

  const storeIcon = Platform.OS === "ios" ? "logo-apple" : "logo-google-playstore";

  const handleOpenStore = async () => {
    try {
      const supported = await Linking.canOpenURL(storeUrl);
      if (supported) {
        await Linking.openURL(storeUrl);
      } else {
        await Linking.openURL(
          Platform.OS === "ios"
            ? "https://apps.apple.com"
            : "https://play.google.com/store"
        );
      }
    } catch {
      // fallback directo
      await Linking.openURL(storeUrl).catch(() => {});
    }
  };

  return (
    <Modal
      visible={true}
      transparent={true}
      animationType="fade"
      statusBarTranslucent={true}
      onRequestClose={() => {
        if (!versionInfo.forceUpdate) setDismissed(true);
      }}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Header Icon */}
          <View style={styles.iconCircle}>
            <Ionicons name="cloud-download" size={36} color={colors.neon} />
          </View>

          {/* Title */}
          <Text style={styles.title}>
            {versionInfo.updateTitle || "¡Actualización Requerida!"}
          </Text>

          {/* Version Pill */}
          <View style={styles.versionPillRow}>
            <View style={styles.versionPillOld}>
              <Text style={styles.versionPillOldText}>Tu versión: v{currentVersion} ({currentBuild})</Text>
            </View>
            <Ionicons name="arrow-forward" size={14} color="#888" />
            <View style={styles.versionPillNew}>
              <Text style={styles.versionPillNewText}>Nueva: v{versionInfo.latestVersion} ({minBuild})</Text>
            </View>
          </View>

          {/* Message */}
          <Text style={styles.message}>
            {versionInfo.updateMessage ||
              "Hay una nueva versión disponible con mejoras críticas de estabilidad y conexión. Por favor actualiza la aplicación para continuar."}
          </Text>

          {/* Primary Action Button */}
          <Pressable
            style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}
            onPress={handleOpenStore}
          >
            <Ionicons name={storeIcon as any} size={20} color="#FFFFFF" />
            <Text style={styles.actionBtnText}>{storeLabel}</Text>
          </Pressable>

          {/* Optional Dismiss button if not forced */}
          {!versionInfo.forceUpdate ? (
            <Pressable style={styles.laterBtn} onPress={() => setDismissed(true)}>
              <Text style={styles.laterBtnText}>Recordarme más tarde</Text>
            </Pressable>
          ) : (
            <Text style={styles.mandatoryNotice}>
              Esta actualización es obligatoria para garantizar un servicio estable.
            </Text>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.88)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    zIndex: 99999,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#0A0D14",
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: colors.neon,
    padding: 24,
    alignItems: "center",
    shadowColor: colors.neon,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 12,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "rgba(0, 0, 255, 0.15)",
    borderWidth: 1.5,
    borderColor: colors.neon,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10,
  },
  versionPillRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  versionPillOld: {
    backgroundColor: "#1F2430",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  versionPillOldText: {
    color: "#8E99AC",
    fontSize: 11,
    fontWeight: "600",
  },
  versionPillNew: {
    backgroundColor: "rgba(0, 0, 255, 0.25)",
    borderColor: colors.neon,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  versionPillNewText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "bold",
  },
  message: {
    color: "#CCCCCC",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 22,
  },
  actionBtn: {
    width: "100%",
    height: 50,
    backgroundColor: colors.neon,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    shadowColor: colors.neon,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  actionBtnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  actionBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "bold",
  },
  laterBtn: {
    marginTop: 14,
    paddingVertical: 8,
  },
  laterBtnText: {
    color: "#888888",
    fontSize: 13,
    fontWeight: "600",
  },
  mandatoryNotice: {
    marginTop: 14,
    color: "#666666",
    fontSize: 11,
    textAlign: "center",
  },
});
