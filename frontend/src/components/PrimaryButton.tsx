import React from "react";
import { Pressable, StyleSheet, Text, View, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/colors";

export function PrimaryButton(props: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  iconName?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  type?: 'primary' | 'secondary' | 'danger';
}) {
  const { type = 'primary', loading, disabled } = props;

  const getBackgroundColor = () => {
    if (disabled) return colors.border;
    if (type === 'primary') return colors.neon;
    if (type === 'danger') return colors.danger;
    return 'transparent';
  };

  const getBorderColor = () => {
    if (disabled) return colors.border;
    if (type === 'primary') return colors.neon;
    if (type === 'danger') return colors.danger;
    if (type === 'secondary') return colors.neon;
    return 'transparent';
  };

  const getTextColor = () => {
    if (disabled) return colors.mutedText;
    if (type === 'secondary') return colors.neon;
    return colors.text; // White text on primary neon button
  };

  const isSecondary = type === 'secondary';

  return (
    <Pressable
      onPress={props.onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: getBackgroundColor(),
          borderColor: getBorderColor(),
          borderWidth: isSecondary ? 1 : 0,
          shadowColor: !disabled && !isSecondary ? getBackgroundColor() : 'transparent',
        },
        pressed && !disabled ? styles.pressed : null,
      ]}
    >
      <View style={styles.inner}>
        {loading ? (
          <ActivityIndicator color={getTextColor()} />
        ) : (
          <>
            {props.iconName ? <Ionicons name={props.iconName} size={20} color={getTextColor()} /> : null}
            <Text style={[styles.text, { color: getTextColor() }]}>{props.label}</Text>
          </>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    // Efecto Glow Neon
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 8,
    marginVertical: 8,
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  text: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
});
