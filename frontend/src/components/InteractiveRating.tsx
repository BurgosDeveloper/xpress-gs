import React, { useState } from "react";
import { View, StyleSheet, Pressable, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/colors";

interface InteractiveRatingProps {
  onRatingSubmit: (rating: number) => void;
  disabled?: boolean;
}

export function InteractiveRating({ onRatingSubmit, disabled }: InteractiveRatingProps) {
  const [hoveredStar, setHoveredStar] = useState<number>(0);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>¿Cómo fue tu experiencia?</Text>
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Pressable
            key={star}
            disabled={disabled}
            onPressIn={() => setHoveredStar(star)}
            onPressOut={() => setHoveredStar(0)}
            onPress={() => onRatingSubmit(star)}
            style={({ pressed }) => [
              styles.starWrap,
              pressed && styles.starWrapPressed
            ]}
          >
            <Ionicons
              name={hoveredStar >= star ? "star" : "star-outline"}
              size={48}
              color={colors.neon}
            />
          </Pressable>
        ))}
      </View>
      <Text style={styles.subtitle}>Toca para calificar</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingVertical: 20,
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    marginVertical: 10,
    shadowColor: colors.neon,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 20,
  },
  starsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  starWrap: {
    padding: 4,
  },
  starWrapPressed: {
    transform: [{ scale: 0.9 }],
  },
  subtitle: {
    color: colors.mutedText,
    fontSize: 14,
  },
});
