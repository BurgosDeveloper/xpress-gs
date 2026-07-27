import type { ServiceType, ServiceMode } from "../rides/rides.types";

export function serviceModeLabel(m: ServiceMode) {
  switch (m) {
    case "TRASLADO":
      return "Traslado";
    case "DELIVERY":
      return "Delivery";
    case "ENVIO":
      return "Envío";
    default:
      return m;
  }
}

export function serviceTypeLabel(t: ServiceType) {
  switch (t) {
    case "CARRO":
      return "Carro";
    case "MOTO":
      return "Moto";
    case "MOTO_CARGA":
      return "Moto carga";
    case "CARRO_CARGA":
      return "Carro carga";
    default:
      return t;
  }
}

export function serviceTypeHasCargo(t: ServiceType) {
  return t === "MOTO_CARGA" || t === "CARRO_CARGA";
}

export function serviceTypeIconName(t: ServiceType): "car-outline" | "bicycle-outline" | "car-sport-outline" | "cube-outline" {
  switch (t) {
    case "CARRO":
      return "car-outline";
    case "MOTO":
      return "bicycle-outline";
    case "MOTO_CARGA":
      return "bicycle-outline";
    case "CARRO_CARGA":
      return "car-sport-outline";
    default:
      return "car-outline";
  }
}
