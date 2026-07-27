import { StatusBar } from "expo-status-bar";
import { enableScreens } from "react-native-screens";
import MapboxGL from "@rnmapbox/maps";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "./src/auth/AuthContext";
import { AppNavigator } from "./src/navigation/AppNavigator";
import { SocketProvider } from "./src/realtime/SocketProvider";

enableScreens();

const mapboxToken =
  process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ||
  process.env.MAPBOX_ACCESS_TOKEN;

if (mapboxToken && String(mapboxToken).trim()) {
  MapboxGL.setAccessToken(String(mapboxToken).trim());
}

export default function App() {
  return (
    <SafeAreaProvider>
      <SocketProvider>
        <AuthProvider>
          <StatusBar style="light" translucent backgroundColor="transparent" />
          <AppNavigator />
        </AuthProvider>
      </SocketProvider>
    </SafeAreaProvider>
  );
}
