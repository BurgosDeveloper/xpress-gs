export const API_BASE_URL = "https://xpress-production-cb01.up.railway.app/api";
export const SOCKET_URL = "https://xpress-production-cb01.up.railway.app";

export interface User {
  id: string;
  email: string;
  role: "ADMIN" | "USER" | "DRIVER";
  isActive: boolean;
}

export interface LiveDriver {
  id: string;
  userId: string;
  fullName: string;
  phone: string;
  photoUrl?: string;
  serviceType: "CARRO" | "MOTO" | "CARRO_CARGA" | "MOTO_CARGA" | string;
  status: "APPROVED" | "OBSERVATION" | "REJECTED" | string;
  isAvailable: boolean;
  avgRating?: number;
  ratingsCount?: number;
  completedRidesCount?: number;
  vehicle?: {
    brand?: string;
    model?: string;
    plate?: string;
    color?: string;
    year?: number;
  };
  location?: {
    lat: number;
    lng: number;
    updatedAt?: string;
  };
  user?: {
    id: string;
    email: string;
    isActive: boolean;
    creditAccount?: {
      balanceCop: number;
    };
  };
  bearing?: number;
  speed?: number;
  isMoving?: boolean;
  lastMovedAt?: number;
}

export interface PendingRide {
  id: string;
  status: string;
  serviceTypeWanted: string;
  pickupLat: number;
  pickupLng: number;
  pickupAddress: string;
  dropoffLat: number;
  dropoffLng: number;
  dropoffAddress: string;
  distanceMeters?: number;
  durationSeconds?: number;
  estimatedPrice?: number;
  agreedPrice?: number;
  createdAt: string;
  passenger?: {
    id: string;
    fullName: string;
    phone: string;
    photoUrl?: string;
  };
  matchedDriver?: {
    id: string;
    fullName: string;
    phone: string;
    photoUrl?: string;
  };
}

export interface AppConfig {
  id: string;
  driverCreditChargeMode: "SERVICE_VALUE" | "FIXED_AMOUNT";
  driverCreditChargePercent: number;
  fxCopPerUsd: number;
  fxCopPerVes: number;
  matchingRadiusM: number;
  zoeWhatsappPhone: string;
  adminWhatsappPhone: string;
  paymentBancolombiaHolder: string;
  paymentBancolombiaAccountNumber: string;
  paymentZelleEmail: string;
}

export interface PricingConfig {
  baseFare: number;
  perKm: number;
  includedMeters: number;
  stepMeters: number;
  stepPrice: number;
}

function getStoredToken(): string | null {
  return localStorage.getItem("xpress_admin_token");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});

  headers.set("Content-Type", "application/json");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const errorMsg = data.message || data.error || `Error ${res.status}: ${res.statusText}`;
    throw new Error(errorMsg);
  }

  return data as T;
}

// ── Auth ──
export async function apiLogin(email: string, password: string): Promise<{ token: string; user: User }> {
  const res = await request<{ ok: true; token: string; user: User }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ user: email.trim(), password }),
  });

  if (res.user.role !== "ADMIN") {
    throw new Error("Acceso denegado: Este panel de control es exclusivo para administradores de Xpress Traslados.");
  }

  localStorage.setItem("xpress_admin_token", res.token);
  localStorage.setItem("xpress_admin_user", JSON.stringify(res.user));
  return res;
}

export async function apiGetMe(): Promise<User | null> {
  try {
    const res = await request<{ id: string; email: string; role: string; isActive: boolean }>("/auth/me");
    if (res.role !== "ADMIN") return null;
    return res as User;
  } catch {
    return null;
  }
}

// ── Live Fleet ──
export async function apiGetLiveFleet(): Promise<{ ok: true; drivers: LiveDriver[]; pendingRides: PendingRide[] }> {
  return request("/admin/fleet/live");
}

// ── Rides & Dispatch ──
export async function apiListRides(take = 50): Promise<{ ok: true; rides: PendingRide[] }> {
  return request(`/admin/rides?take=${take}`);
}

export async function apiGetRidesStats(): Promise<{ total: number; byStatus: Record<string, number> }> {
  return request("/admin/rides/stats");
}

export async function apiAssignRideDriver(rideId: string, driverId: string): Promise<{ ok: true; ride: any }> {
  return request(`/admin/rides/${rideId}/assign-driver`, {
    method: "POST",
    body: JSON.stringify({ driverId }),
  });
}

// ── Drivers ──
export async function apiListDrivers(): Promise<{ ok: true; drivers: LiveDriver[] }> {
  return request("/admin/drivers");
}

export async function apiUpdateDriverStatus(driverId: string, status: "APPROVED" | "OBSERVATION" | "REJECTED"): Promise<any> {
  return request(`/admin/drivers/${driverId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function apiSetDriverActive(driverId: string, isActive: boolean): Promise<any> {
  return request(`/admin/drivers/${driverId}/active`, {
    method: "PATCH",
    body: JSON.stringify({ isActive }),
  });
}

export async function apiAdjustDriverCredits(driverId: string, deltaCop: number, note?: string): Promise<any> {
  return request(`/admin/drivers/${driverId}/credits`, {
    method: "PATCH",
    body: JSON.stringify({ deltaCop, note }),
  });
}

// ── Passengers ──
export async function apiListPassengers(take = 50): Promise<{ ok: true; passengers: any[] }> {
  return request(`/admin/passengers?take=${take}`);
}

export async function apiSetPassengerActive(passengerId: string, isActive: boolean): Promise<any> {
  return request(`/admin/passengers/${passengerId}/active`, {
    method: "PATCH",
    body: JSON.stringify({ isActive }),
  });
}

// ── Config ──
export async function apiGetAppConfig(): Promise<{ ok: true; appConfig: AppConfig; pricing: PricingConfig }> {
  return request("/admin/app-config");
}

export async function apiUpdateAppConfig(input: Partial<AppConfig & PricingConfig>): Promise<any> {
  return request("/admin/app-config", {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function apiListZoneFixedPrices(): Promise<{ ok: true; items: any[] }> {
  return request("/admin/zones/fixed-prices");
}
