import { Linking } from "react-native";

/**
 * Limpia una cadena de teléfono dejando solo dígitos y el signo + si existe al inicio.
 */
export function cleanPhoneNumber(rawPhone: string): string {
  if (!rawPhone) return "";
  const cleaned = rawPhone.replace(/[^\d+]/g, "");
  return cleaned;
}

/**
 * Convierte un número de teléfono crudo a formato internacional para WhatsApp.
 * Si el número comienza con 04xx (ej: 04141234567), lo convierte a 584141234567.
 * Si no incluye prefijo internacional +, agrega defaultCountryCode (por defecto 58 para Venezuela).
 */
export function formatPhoneForWhatsapp(rawPhone: string, defaultCountryCode = "58"): string {
  let cleaned = cleanPhoneNumber(rawPhone);
  if (!cleaned) return "";

  // Si tiene signo + al inicio, removerlo para la URL de wa.me
  if (cleaned.startsWith("+")) {
    cleaned = cleaned.slice(1);
  }

  // Si empieza con 0 (ej: 04141234567 -> 584141234567)
  if (cleaned.startsWith("0")) {
    cleaned = defaultCountryCode + cleaned.slice(1);
  } else if (!cleaned.startsWith(defaultCountryCode) && cleaned.length <= 10) {
    // Si no tiene prefijo del país y tiene 10 dígitos o menos (ej: 4141234567 -> 584141234567)
    cleaned = defaultCountryCode + cleaned;
  }

  return cleaned;
}

/**
 * Abre la app de llamadas del teléfono con el número formateado.
 */
export async function openPhoneCall(rawPhone: string): Promise<void> {
  const cleaned = cleanPhoneNumber(rawPhone);
  if (!cleaned) return;
  const url = `tel:${cleaned}`;
  const supported = await Linking.canOpenURL(url);
  if (supported) {
    await Linking.openURL(url);
  } else {
    await Linking.openURL(url);
  }
}

/**
 * Abre la app de WhatsApp directamente con el número limpiado y formateado.
 */
export async function openWhatsappMessage(rawPhone: string, message?: string): Promise<void> {
  const waPhone = formatPhoneForWhatsapp(rawPhone);
  if (!waPhone) return;
  const textEncoded = message ? encodeURIComponent(message) : "";
  const url = `https://wa.me/${waPhone}${textEncoded ? `?text=${textEncoded}` : ""}`;
  await Linking.openURL(url);
}

export function buildTelUrl(rawPhone: string): string {
  const cleaned = cleanPhoneNumber(rawPhone);
  return cleaned ? `tel:${cleaned}` : "";
}

export async function openDialer(rawPhone: string): Promise<void> {
  return openPhoneCall(rawPhone);
}
