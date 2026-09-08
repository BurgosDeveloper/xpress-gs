import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../theme/colors";
import { GeocodingPlace, searchPlaces } from "../../services/geocoding.service";

export interface MapPlaceSearchBarProps {
  currentCenter?: { lat: number; lng: number };
  destinationAddress?: string | null;
  onSelectDestination: (place: GeocodingPlace) => void;
  onClearDestination?: () => void;
  style?: any;
}

export function MapPlaceSearchBar({
  currentCenter,
  destinationAddress,
  onSelectDestination,
  onClearDestination,
  style,
}: MapPlaceSearchBarProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodingPlace[]>([]);
  const [loading, setLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const debounceTimerRef = useRef<any>(null);

  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    debounceTimerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const places = await searchPlaces(query, currentCenter);
        setResults(places);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [query, currentCenter]);

  function handleSelect(place: GeocodingPlace) {
    Keyboard.dismiss();
    setResults([]);
    setIsFocused(false);
    setQuery("");
    onSelectDestination(place);
  }

  function handleClear() {
    setQuery("");
    setResults([]);
    if (onClearDestination) {
      onClearDestination();
    }
  }

  const showDropdown = isFocused && (results.length > 0 || loading || query.trim().length >= 2);

  return (
    <View style={[styles.wrapper, style]}>
      {/* Barra de Búsqueda Principal */}
      <View style={[styles.searchBar, isFocused && styles.searchBarFocused]}>
        <View style={styles.iconWrap}>
          <Ionicons name="navigate-circle" size={24} color="#0000FF" />
        </View>

        <TextInput
          style={styles.input}
          placeholder={
            destinationAddress
              ? `Destino: ${destinationAddress}`
              : "¿A dónde vas? (Buscar Punto B)"
          }
          placeholderTextColor={destinationAddress ? "#66B2FF" : "#8E8E93"}
          value={query}
          onChangeText={setQuery}
          onFocus={() => setIsFocused(true)}
          returnKeyType="search"
          autoCorrect={false}
          accessibilityLabel="Buscador de destino en el mapa"
        />

        {loading ? (
          <ActivityIndicator size="small" color="#0000FF" style={styles.actionBtn} />
        ) : query.length > 0 || destinationAddress ? (
          <Pressable
            onPress={handleClear}
            style={styles.actionBtn}
            accessibilityRole="button"
            accessibilityLabel="Limpiar destino"
          >
            <Ionicons name="close-circle" size={20} color="#8E8E93" />
          </Pressable>
        ) : (
          <View style={styles.actionBtn}>
            <Ionicons name="search" size={18} color="#666" />
          </View>
        )}
      </View>

      {/* Menú Flotante de Resultados Autocompletados */}
      {showDropdown ? (
        <View style={styles.dropdown}>
          {loading && results.length === 0 ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color="#0000FF" />
              <Text style={styles.loadingText}>Buscando lugares cercanos...</Text>
            </View>
          ) : results.length > 0 ? (
            <FlatList
              data={results}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <Pressable
                  style={({ pressed }) => [styles.resultItem, pressed && styles.resultItemPressed]}
                  onPress={() => handleSelect(item)}
                >
                  <View style={styles.resultIconWrap}>
                    <Ionicons name="location-sharp" size={18} color="#FF3344" />
                  </View>
                  <View style={styles.resultTextWrap}>
                    <Text style={styles.resultTitle} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.resultSubtitle} numberOfLines={1}>
                      {item.fullAddress}
                    </Text>
                  </View>
                </Pressable>
              )}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          ) : (
            <View style={styles.noResultsRow}>
              <Ionicons name="alert-circle-outline" size={18} color="#A0A0A0" />
              <Text style={styles.noResultsText}>
                No se encontraron lugares. También puedes tocar cualquier punto del mapa para fijar el Punto B.
              </Text>
            </View>
          )}

          {/* Opción rápida de cierre */}
          <Pressable
            style={styles.closeDropdownBtn}
            onPress={() => {
              Keyboard.dismiss();
              setIsFocused(false);
            }}
          >
            <Text style={styles.closeDropdownText}>Ocultar sugerencias</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    zIndex: 99,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(12, 12, 18, 0.95)",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 16,
    paddingHorizontal: 12,
    height: 52,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.85,
    shadowRadius: 10,
    elevation: 8,
  },
  searchBarFocused: {
    borderColor: "#0000FF",
    backgroundColor: "rgba(8, 8, 14, 0.98)",
  },
  iconWrap: {
    marginRight: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    paddingVertical: 0,
  },
  actionBtn: {
    padding: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  dropdown: {
    marginTop: 8,
    backgroundColor: "rgba(10, 10, 16, 0.96)",
    borderWidth: 1,
    borderColor: "rgba(0, 0, 255, 0.35)",
    borderRadius: 16,
    maxHeight: 240,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.9,
    shadowRadius: 12,
    elevation: 10,
    overflow: "hidden",
  },
  resultItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  resultItemPressed: {
    backgroundColor: "rgba(0, 0, 255, 0.2)",
  },
  resultIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(255, 51, 68, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  resultTextWrap: {
    flex: 1,
  },
  resultTitle: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 2,
  },
  resultSubtitle: {
    color: colors.mutedText,
    fontSize: 11,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    gap: 10,
  },
  loadingText: {
    color: colors.mutedText,
    fontSize: 12,
  },
  noResultsRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 8,
  },
  noResultsText: {
    flex: 1,
    color: colors.mutedText,
    fontSize: 11,
    lineHeight: 16,
  },
  closeDropdownBtn: {
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.08)",
  },
  closeDropdownText: {
    color: "#66B2FF",
    fontSize: 12,
    fontWeight: "700",
  },
});
