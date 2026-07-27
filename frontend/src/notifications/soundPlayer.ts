import { Audio } from "expo-av";
import { Platform } from "react-native";
import type { SoundName } from "./channels";

const SOUND_ASSETS: Record<SoundName, any> = {
  tienes_servicio: require("../../assets/notifications/tienes_servicio.mp3"),
  aceptar_servicio: require("../../assets/notifications/aceptar_servicio.mp3"),
  uber_llego: require("../../assets/notifications/uber_llego.mp3"),
  disponibles: require("../../assets/notifications/disponibles.mp3"),
};

let audioModeReady = false;
let playChain: Promise<void> = Promise.resolve();

async function ensureAudioMode() {
  if (audioModeReady) return;
  audioModeReady = true;
  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: false,
      playThroughEarpieceAndroid: false,
    });
  } catch {
    // best-effort
  }
}

export function playNotificationSound(soundName: SoundName) {
  // Serializa para evitar solapamientos (varias notifs juntas).
  playChain = playChain.then(async () => {
    const source = SOUND_ASSETS[soundName];
    if (!source) return;

    try {
      await ensureAudioMode();
      const { sound } = await Audio.Sound.createAsync(
        source,
        {
          shouldPlay: true,
          volume: 1.0,
          isLooping: false,
        }
      );

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          void sound.unloadAsync().catch(() => {});
        }
      });
    } catch {
      // best-effort
    }
  });

  return playChain;
}

export async function preloadNotificationSounds() {
  await ensureAudioMode();
}
