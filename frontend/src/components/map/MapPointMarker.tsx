import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../theme/colors";

export type MapPointType = "A" | "B" | "DRIVER" | "CUSTOM";

export interface MapPointMarkerProps {
  type: MapPointType;
  label?: string;
  tag?: string;
  pinColor?: string;
  isDraggable?: boolean;
  bearing?: number;
  vehicleType?: "CARRO" | "MOTO" | "MOTO_CARGA" | "CARRO_CARGA";
}

/**
 * Componente modular de marcador de alta gama para Mapbox.
 * Diseñado con estética Dark Neon (Azul #0000FF / Blanco / Acentos luminosos).
 * Cumple con soporte idéntico y optimizado para iOS y Android.
 */
export function MapPointMarker({
  type,
  label,
  tag,
  pinColor,
  isDraggable,
  bearing = 0,
  vehicleType = "CARRO",
}: MapPointMarkerProps) {
  if (type === "DRIVER") {
    const isMoto = vehicleType === "MOTO" || vehicleType === "MOTO_CARGA";
    const iconName = isMoto ? "bicycle" : "car";

    return (
      <View style={styles.driverContainer}>
        {/* Halo de pulso radar */}
        <View style={styles.driverPulseHalo} />
        {/* Cuerpo del vehículo con rotación según bearing */}
        <View
          style={[
            styles.driverBadge,
            {
              transform: [{ rotate: `${bearing}deg` }],
              borderColor: pinColor || "#0000FF",
            },
          ]}
        >
          <Ionicons name={iconName} size={18} color="#FFFFFF" />
        </View>
      </View>
    );
  }

  const isPointA = type === "A";
  const mainColor = pinColor || (isPointA ? "#0000FF" : "#FF3344");
  const glowColor = isPointA ? "rgba(0, 0, 255, 0.45)" : "rgba(255, 51, 68, 0.45)";
  const letter = isPointA ? "A" : "B";
  const displayTag = tag || (isPointA ? "ORIGEN" : "DESTINO");

  return (
    <View style={styles.pinWrapper}>
      {/* Etiqueta superior opcional */}
      {displayTag ? (
        <View style={[styles.tagBadge, { backgroundColor: "rgba(10, 10, 15, 0.92)", borderColor: mainColor }]}>
          <Text style={[styles.tagText, { color: isPointA ? "#66B2FF" : "#FFAAA6" }]}>{displayTag}</Text>
        </View>
      ) : null}

      {/* Pin circular con letra A o B */}
      <View
        style={[
          styles.circlePin,
          {
            backgroundColor: mainColor,
            borderColor: "#FFFFFF",
            shadowColor: mainColor,
          },
        ]}
      >
        <Text style={styles.letterText}>{label || letter}</Text>

        {isDraggable ? (
          <View style={styles.dragIndicator}>
            <Ionicons name="move" size={9} color="#FFFFFF" />
          </View>
        ) : null}
      </View>

      {/* Aguja / Punta inferior de precisión hacia las coordenadas */}
      <View style={[styles.needle, { borderTopColor: mainColor }]} />

      {/* Punto de anclaje de sombra en el suelo */}
      <View style={[styles.shadowDot, { backgroundColor: glowColor }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  pinWrapper: {
    alignItems: "center",
    justifyContent: "center",
    width: 60,
    height: 70,
  },
  tagBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    marginBottom: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 3,
    elevation: 4,
  },
  tagText: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.6,
  },
  circlePin: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2.5,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.85,
    shadowRadius: 8,
    elevation: 8,
    position: "relative",
  },
  letterText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
    textAlign: "center",
    includeFontPadding: false,
  },
  dragIndicator: {
    position: "absolute",
    right: -2,
    top: -2,
    backgroundColor: "#000000",
    borderRadius: 6,
    padding: 1,
    borderWidth: 1,
    borderColor: "#FFFFFF",
  },
  needle: {
    width: 0,
    height: 0,
    backgroundColor: "transparent",
    borderStyle: "solid",
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    marginTop: -1,
  },
  shadowDot: {
    width: 8,
    height: 4,
    borderRadius: 4,
    marginTop: 1,
  },
  // Chofer
  driverContainer: {
    alignItems: "center",
    justifyContent: "center",
    width: 44,
    height: 44,
  },
  driverPulseHalo: {
    position: "absolute",
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(0, 0, 255, 0.25)",
    borderWidth: 1,
    borderColor: "rgba(0, 0, 255, 0.5)",
  },
  driverBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#050515",
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0000FF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 6,
  },
});
