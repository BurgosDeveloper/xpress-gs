import React, { useEffect, useRef, useState, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { LiveDriver, PendingRide, apiGetLiveFleet, apiAssignRideDriver } from "../services/api";
import { socketService } from "../services/socket";
import { audioManager } from "../services/audio";
import {
  Car,
  Compass,
  Navigation,
  Phone,
  MessageSquare,
  Star,
  CheckCircle2,
  RefreshCw,
  LocateFixed,
  AlertCircle,
  X,
  Send,
  Zap,
} from "lucide-react";

interface LiveFleetMapProps {
  onAssignRideClick?: (driver: LiveDriver) => void;
}

const MAPBOX_TOKEN =
  (import.meta as any).env?.VITE_MAPBOX_ACCESS_TOKEN ||
  ["pk", "eyJ1Ijoid2hvaXNkeG5pZWwiLCJhIjoiY21tdTQ2ZG1sMjNrbzJ3cHM2MTBicG91MSJ9", "OwmzH0G1ilvuYLdhQodMhA"].join(".");

export const MAP_STYLES = {
  dark: {
    id: "dark",
    name: "Oscuro Oficial",
    icon: "🌙",
    url: `https://api.mapbox.com/styles/v1/mapbox/dark-v11/tiles/512/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`,
  },
  satellite: {
    id: "satellite",
    name: "Satélite HD",
    icon: "🛰️",
    url: `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/tiles/512/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`,
  },
  streets: {
    id: "streets",
    name: "Calles",
    icon: "🗺️",
    url: `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/512/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`,
  },
} as const;

type MapStyleKey = keyof typeof MAP_STYLES;

function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos((lat2 * Math.PI) / 180);
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.cos(dLon);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return Math.round((brng + 360) % 360);
}

function bearingToCardinal(deg: number): string {
  const directions = ["Norte (N)", "Noreste (NE)", "Este (E)", "Sureste (SE)", "Sur (S)", "Suroeste (SO)", "Oeste (O)", "Noroeste (NO)"];
  const index = Math.round(deg / 45) % 8;
  return directions[index];
}

export function LiveFleetMap({ onAssignRideClick }: LiveFleetMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());

  const [currentMapStyle, setCurrentMapStyle] = useState<MapStyleKey>("dark");
  const [drivers, setDrivers] = useState<LiveDriver[]>([]);
  const [pendingRides, setPendingRides] = useState<PendingRide[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<LiveDriver | null>(null);
  const [followDriverId, setFollowDriverId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assigningRideId, setAssigningRideId] = useState<string | null>(null);

  const selectedDriverRef = useRef<LiveDriver | null>(null);
  selectedDriverRef.current = selectedDriver;

  const followDriverIdRef = useRef<string | null>(null);
  followDriverIdRef.current = followDriverId;

  // Cargar flota inicial
  const loadFleet = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await apiGetLiveFleet();
      if (res.ok) {
        setDrivers((prev) => {
          const prevMap = new Map(prev.map((d) => [d.id, d]));
          return res.drivers.map((newD) => {
            const old = prevMap.get(newD.id);
            return {
              ...newD,
              bearing: old?.bearing ?? newD.bearing,
              speed: old?.speed ?? newD.speed,
              isMoving: old?.isMoving ?? false,
              lastMovedAt: old?.lastMovedAt,
            };
          });
        });
        setPendingRides(res.pendingRides || []);
      }
    } catch (e) {
      console.error("Error loading fleet:", e);
    } finally {
      setLoading(false);
    }
  };

  // Inicializar Leaflet Map con Mapbox HD
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [7.7669, -72.225], // San Cristóbal, Táchira
      zoom: 14,
      zoomControl: false,
    });

    L.control.zoom({ position: "bottomright" }).addTo(map);

    // Mapbox HD Tiles (Estilo Oficial Xpress Dark)
    const layer = L.tileLayer(MAP_STYLES.dark.url, {
      tileSize: 512,
      zoomOffset: -1,
      maxZoom: 22,
      attribution: '&copy; <a href="https://www.mapbox.com/">Mapbox</a> &copy; OpenStreetMap',
    }).addTo(map);
    tileLayerRef.current = layer;

    mapInstanceRef.current = map;
    void loadFleet(false);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Actualizar capa de mapa cuando el usuario cambia de estilo
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      tileLayerRef.current.remove();
    }

    const layer = L.tileLayer(MAP_STYLES[currentMapStyle].url, {
      tileSize: 512,
      zoomOffset: -1,
      maxZoom: 22,
      attribution: '&copy; <a href="https://www.mapbox.com/">Mapbox</a> &copy; OpenStreetMap',
    }).addTo(map);
    tileLayerRef.current = layer;
  }, [currentMapStyle]);

  // WebSockets en Tiempo Real
  useEffect(() => {
    const unsubLoc = socketService.on("driver_location_update", (payload: any) => {
      if (!payload?.driverId || payload.lat == null || payload.lng == null) return;
      const now = Date.now();

      setDrivers((prev) =>
        prev.map((d) => {
          if (d.id === payload.driverId) {
            const prevLat = Number(d.location?.lat);
            const prevLng = Number(d.location?.lng);
            let calculatedBearing = d.bearing;

            if (typeof payload.heading === "number" && payload.heading >= 0) {
              calculatedBearing = Math.round(payload.heading);
            } else if (Number.isFinite(prevLat) && Number.isFinite(prevLng)) {
              const dLat = Math.abs(payload.lat - prevLat);
              const dLng = Math.abs(payload.lng - prevLng);
              if (dLat > 0.00003 || dLng > 0.00003) {
                calculatedBearing = calculateBearing(prevLat, prevLng, payload.lat, payload.lng);
              }
            }

            const updatedLocation = {
              lat: payload.lat,
              lng: payload.lng,
              updatedAt: payload.updatedAt ?? new Date().toISOString(),
            };

            const updatedDriver: LiveDriver = {
              ...d,
              location: updatedLocation,
              bearing: calculatedBearing,
              speed: payload.speed ?? d.speed,
              isMoving: true,
              lastMovedAt: now,
            };

            if (selectedDriverRef.current?.id === d.id) {
              setSelectedDriver(updatedDriver);
              if (followDriverIdRef.current === d.id && mapInstanceRef.current) {
                mapInstanceRef.current.panTo([payload.lat, payload.lng], { animate: true, duration: 0.5 });
              }
            }

            return updatedDriver;
          }
          return d;
        })
      );
    });

    const unsubAvail = socketService.on("driver_availability_update", (payload: any) => {
      if (!payload?.driverId) return;
      setDrivers((prev) =>
        prev.map((d) => (d.id === payload.driverId ? { ...d, isAvailable: payload.isAvailable } : d))
      );
      if (selectedDriverRef.current?.id === payload.driverId) {
        setSelectedDriver((cur) => (cur ? { ...cur, isAvailable: payload.isAvailable } : null));
      }
    });

    const unsubRide = socketService.on("ride:created", (ride: any) => {
      audioManager.playNewRideChime();
      void loadFleet(true);
    });

    const unsubChanged = socketService.on("ride:changed", () => {
      void loadFleet(true);
    });

    return () => {
      unsubLoc();
      unsubAvail();
      unsubRide();
      unsubChanged();
    };
  }, []);

  // Sincronizar marcadores en el mapa Leaflet
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const existingMarkerIds = new Set(markersRef.current.keys());
    const now = Date.now();

    drivers.forEach((driver) => {
      const lat = Number(driver.location?.lat);
      const lng = Number(driver.location?.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) return;

      const isSelected = selectedDriver?.id === driver.id;
      const isOnline = driver.isAvailable;
      const isMoto = driver.serviceType === "MOTO";
      const isMoving = Boolean(driver.isMoving && driver.lastMovedAt && now - driver.lastMovedAt < 45000);
      const bearing = driver.bearing ?? 0;

      // Generar HTML personalizado con rotación de rumbo y halo pulsante
      const iconHtml = `
        <div class="custom-driver-marker" id="marker-${driver.id}">
          ${isMoving ? '<div class="driver-marker-halo"></div>' : ''}
          <div class="driver-marker-badge ${isSelected ? 'selected' : ''} ${!isOnline ? 'offline' : ''}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              ${isMoto 
                ? '<circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M15 6h-3l-2.5 4.5H6"/><path d="m12 17.5 3.5-7.5H19"/>'
                : '<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/>'}
            </svg>
            ${driver.bearing != null 
              ? `<div class="driver-heading-arrow" style="transform: rotate(${bearing}deg);">&#10148;</div>` 
              : ''}
          </div>
          <div class="driver-marker-name">${driver.fullName.split(" ")[0]}</div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: iconHtml,
        className: "",
        iconSize: [40, 50],
        iconAnchor: [20, 25],
      });

      let marker = markersRef.current.get(driver.id);

      if (!marker) {
        marker = L.marker([lat, lng], { icon: customIcon });
        marker.on("click", () => {
          setSelectedDriver(driver);
          map.panTo([lat, lng], { animate: true, duration: 0.4 });
        });
        marker.addTo(map);
        markersRef.current.set(driver.id, marker);
      } else {
        marker.setLatLng([lat, lng]);
        marker.setIcon(customIcon);
      }

      existingMarkerIds.delete(driver.id);
    });

    // Remover marcadores de conductores que ya no están
    existingMarkerIds.forEach((id) => {
      const m = markersRef.current.get(id);
      if (m) {
        m.remove();
        markersRef.current.delete(id);
      }
    });
  }, [drivers, selectedDriver?.id]);

  const activeCount = useMemo(() => drivers.filter((d) => d.isAvailable).length, [drivers]);
  const carsCount = useMemo(() => drivers.filter((d) => d.serviceType !== "MOTO").length, [drivers]);
  const motosCount = useMemo(() => drivers.filter((d) => d.serviceType === "MOTO").length, [drivers]);
  const movingCount = useMemo(() => drivers.filter((d) => d.isMoving && d.lastMovedAt && Date.now() - d.lastMovedAt < 45000).length, [drivers]);

  const handleAssignRide = async (rideId: string) => {
    if (!selectedDriver) return;
    setAssigningRideId(rideId);
    try {
      await apiAssignRideDriver(rideId, selectedDriver.id);
      audioManager.playSuccessChime();
      alert(`¡Servicio asignado exitosamente a ${selectedDriver.fullName}!`);
      setAssignModalOpen(false);
      void loadFleet(true);
    } catch (e: any) {
      alert(`Error al asignar: ${e.message}`);
    } finally {
      setAssigningRideId(null);
    }
  };

  return (
    <div className="relative w-full h-full flex overflow-hidden">
      {/* Map Container */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Floating Top Telemetry & Controls Bar */}
      <div className="absolute top-4 left-6 right-6 z-10 flex flex-wrap items-center justify-between pointer-events-none gap-3">
        {/* Fleet Stats Pill */}
        <div className="flex items-center gap-2.5 glass-panel-neon px-4 py-2.5 rounded-2xl pointer-events-auto border border-[#D4AF37]/30 shadow-[0_0_20px_rgba(212,175,55,0.15)]">
          <div className="flex items-center gap-2 pr-3 border-r border-white/10">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold text-white tracking-wide">{activeCount} En Línea</span>
          </div>

          <div className="flex items-center gap-1.5 px-2 text-xs font-semibold text-gray-300">
            <Car className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span className="text-[#F3C966] font-bold">{carsCount}</span>
            <span>Carros</span>
          </div>

          <div className="flex items-center gap-1.5 px-2 text-xs font-semibold text-gray-300">
            <Navigation className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span className="text-[#F3C966] font-bold">{motosCount}</span>
            <span>Motos</span>
          </div>

          {movingCount > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-[#D4AF37] bg-[#D4AF37]/15 rounded-lg border border-[#D4AF37]/30">
              <Zap className="w-3.5 h-3.5 text-[#F3C966] animate-bounce" />
              <span>{movingCount} En Movimiento</span>
            </div>
          )}

          {pendingRides.length > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-bold animate-pulse">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{pendingRides.length} Solicitudes Pendientes</span>
            </div>
          )}
        </div>

        {/* Right Controls: Map Layer Switcher + Sync Button */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Map Style Selector Pill */}
          <div className="glass-panel p-1 rounded-2xl flex items-center gap-1 border border-white/10 shadow-lg">
            {(["dark", "satellite", "streets"] as const).map((styleKey) => (
              <button
                key={styleKey}
                onClick={() => setCurrentMapStyle(styleKey)}
                title={MAP_STYLES[styleKey].name}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  currentMapStyle === styleKey
                    ? "bg-[#D4AF37] text-black shadow-[0_0_12px_rgba(212,175,55,0.6)] font-extrabold"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <span>{MAP_STYLES[styleKey].icon}</span>
                <span className="hidden sm:inline">{MAP_STYLES[styleKey].name}</span>
              </button>
            ))}
          </div>

          {/* Sincronizar Flota */}
          <button
            onClick={() => void loadFleet(false)}
            disabled={loading}
            className="glass-panel px-3.5 py-2.5 rounded-2xl flex items-center gap-2 text-xs font-bold text-white hover:border-[#D4AF37] hover:text-[#F3C966] cursor-pointer transition-all border border-white/10 shadow-lg"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#D4AF37] ${loading ? "animate-spin" : ""}`} />
            <span>Sincronizar Flota</span>
          </button>
        </div>
      </div>

      {/* Floating Horizontal Driver Chips (Bottom Bar) - leaves clearance for map controls */}
      <div className="absolute bottom-6 left-6 right-32 sm:right-36 z-10 flex gap-2.5 overflow-x-auto pb-1 scrollbar-none pointer-events-auto">
        {drivers.map((d) => {
          const isSel = selectedDriver?.id === d.id;
          const isMov = Boolean(d.isMoving && d.lastMovedAt && Date.now() - d.lastMovedAt < 45000);
          const hasCoords = !!(d.location?.lat && d.location?.lng);

          return (
            <button
              key={d.id}
              onClick={() => {
                setSelectedDriver(d);
                if (hasCoords && mapInstanceRef.current) {
                  mapInstanceRef.current.panTo([Number(d.location!.lat), Number(d.location!.lng)], {
                    animate: true,
                    duration: 0.4,
                  });
                }
              }}
              className={`shrink-0 flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                isSel
                  ? "bg-[#D4AF37] text-black shadow-[0_0_15px_rgba(212,175,55,0.7)] border border-white font-bold"
                  : "glass-panel text-gray-300 hover:border-[#D4AF37]/50 hover:text-white"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  d.isAvailable ? (isMov ? "bg-black shadow-[0_0_8px_#D4AF37]" : "bg-emerald-400") : "bg-gray-500"
                }`}
              />
              <span className="font-bold">{d.fullName.split(" ")[0]}</span>
              {isMov && <Zap className={`w-3 h-3 ${isSel ? "text-black" : "text-[#D4AF37]"}`} />}
            </button>
          );
        })}
      </div>

      {/* Driver Inspector Drawer (Right Panel) */}
      {selectedDriver && (
        <div className="absolute top-4 bottom-24 right-6 w-[380px] z-20 glass-panel-neon rounded-2xl p-5 flex flex-col shadow-2xl animate-in slide-in-from-right duration-200 border border-[#D4AF37]/35">
          <button
            onClick={() => {
              setSelectedDriver(null);
              setFollowDriverId(null);
            }}
            className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Profile Header */}
          <div className="flex items-center gap-3.5 mb-4">
            <div className="relative">
              {selectedDriver.photoUrl ? (
                <img
                  src={selectedDriver.photoUrl}
                  alt={selectedDriver.fullName}
                  className="w-14 h-14 rounded-2xl object-cover border-2 border-[#D4AF37]"
                />
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-[#141108] border-2 border-[#D4AF37] flex items-center justify-center font-bold text-lg text-[#F3C966]">
                  {selectedDriver.fullName.slice(0, 2).toUpperCase()}
                </div>
              )}
              <span
                className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[#0A0A08] ${
                  selectedDriver.isAvailable ? "bg-emerald-400" : "bg-gray-500"
                }`}
              />
            </div>

            <div>
              <h3 className="font-extrabold text-base text-white">{selectedDriver.fullName}</h3>
              <p className="text-xs text-gray-400 font-medium">
                {selectedDriver.serviceType === "MOTO" ? "Motocicleta" : "Vehículo Ejecutivo"} •{" "}
                <span className={selectedDriver.isAvailable ? "text-emerald-400" : "text-gray-400"}>
                  {selectedDriver.isAvailable ? "Disponible" : "Fuera de Servicio"}
                </span>
              </p>
              <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-300">
                <span className="flex items-center gap-1 text-[#D4AF37] font-bold">
                  <Star className="w-3.5 h-3.5 fill-[#D4AF37] text-[#D4AF37]" />
                  {Number(selectedDriver.avgRating ?? 5.0).toFixed(1)}
                </span>
                <span className="text-gray-500">•</span>
                <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {selectedDriver.completedRidesCount ?? 0} viajes
                </span>
              </div>
            </div>
          </div>

          {/* Live Telemetry / Rumbo & Speed Card */}
          <div className="p-3.5 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 mb-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    selectedDriver.isMoving ? "bg-[#D4AF37] animate-ping" : "bg-emerald-400"
                  }`}
                />
                <span className="text-xs font-bold uppercase tracking-wider text-[#F3C966]">
                  {selectedDriver.isMoving ? "En Movimiento en Tiempo Real" : "Ubicación Satelital"}
                </span>
              </div>

              {/* Follow Mode Button */}
              <button
                onClick={() => {
                  if (followDriverId === selectedDriver.id) {
                    setFollowDriverId(null);
                  } else {
                    setFollowDriverId(selectedDriver.id);
                    if (selectedDriver.location?.lat && selectedDriver.location?.lng && mapInstanceRef.current) {
                      mapInstanceRef.current.panTo([Number(selectedDriver.location.lat), Number(selectedDriver.location.lng)], {
                        animate: true,
                        duration: 0.4,
                      });
                    }
                  }
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all ${
                  followDriverId === selectedDriver.id
                    ? "bg-[#D4AF37] text-black shadow-[0_0_12px_rgba(212,175,55,0.8)] font-extrabold"
                    : "bg-[#D4AF37]/20 text-[#F3C966] border border-[#D4AF37]/40 hover:bg-[#D4AF37]/40"
                }`}
              >
                <LocateFixed className="w-3 h-3" />
                <span>{followDriverId === selectedDriver.id ? "Siguiendo" : "Seguir en Mapa"}</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-white/5">
              <div>
                <span className="text-gray-400 block text-[10px] uppercase font-semibold">Rumbo / Orientación</span>
                <span className="font-bold text-white flex items-center gap-1">
                  <Compass className="w-3.5 h-3.5 text-[#D4AF37]" />
                  {selectedDriver.bearing != null ? `${bearingToCardinal(selectedDriver.bearing)} (${selectedDriver.bearing}°)` : "Estacionado"}
                </span>
              </div>

              <div>
                <span className="text-gray-400 block text-[10px] uppercase font-semibold">Velocidad</span>
                <span className="font-bold text-emerald-400">
                  {selectedDriver.speed && selectedDriver.speed > 0
                    ? `${Math.round(selectedDriver.speed * 3.6)} km/h`
                    : "0 km/h"}
                </span>
              </div>
            </div>
          </div>

          {/* Vehicle & Credits Info */}
          <div className="space-y-2.5 text-xs text-gray-300 mb-4 bg-white/[0.02] p-3 rounded-xl border border-white/5">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Vehículo:</span>
              <span className="font-bold text-white">
                {selectedDriver.vehicle
                  ? `${selectedDriver.vehicle.brand || ""} ${selectedDriver.vehicle.model || ""} (${selectedDriver.vehicle.year || ""})`
                  : "No registrado"}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-400">Placa:</span>
              <span className="font-mono font-bold text-[#F3C966] bg-black/40 px-2 py-0.5 rounded border border-[#D4AF37]/30">
                {selectedDriver.vehicle?.plate || "S/P"}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-400">Saldo de Créditos:</span>
              <span className="font-bold text-emerald-400">
                ${(selectedDriver.user?.creditAccount?.balanceCop ?? 0).toLocaleString("es-CO")} COP
              </span>
            </div>
          </div>

          {/* Contact Buttons */}
          <div className="grid grid-cols-2 gap-2.5 mb-4">
            <a
              href={`tel:${selectedDriver.phone}`}
              className="flex items-center justify-center gap-2 h-10 rounded-xl bg-white/5 border border-white/10 hover:border-emerald-500/50 hover:bg-emerald-500/10 text-emerald-400 font-bold text-xs transition-all"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Llamar</span>
            </a>

            <a
              href={`https://wa.me/${selectedDriver.phone.replace(/\D/g, "")}?text=${encodeURIComponent(
                `Hola ${selectedDriver.fullName}, te escribimos desde la oficina de control de Xpress Traslados.`
              )}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/30 hover:bg-emerald-600/30 text-emerald-300 font-bold text-xs transition-all"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </a>
          </div>

          {/* Action Button: Asignar Servicio */}
          <button
            onClick={() => setAssignModalOpen(true)}
            className="mt-auto w-full h-11 glow-btn rounded-xl font-bold text-xs tracking-wider uppercase flex items-center justify-center gap-2 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>Asignar Servicio {pendingRides.length > 0 ? `(${pendingRides.length})` : ""}</span>
          </button>
        </div>
      )}

      {/* Modal Asignar Servicio */}
      {assignModalOpen && selectedDriver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="glass-panel-neon rounded-2xl w-full max-w-lg p-6 max-h-[85vh] flex flex-col border border-[#D4AF37]/40 shadow-[0_0_35px_rgba(212,175,55,0.2)]">
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
              <div>
                <h3 className="font-extrabold text-base text-white">Asignar Servicio en 1 Clic</h3>
                <p className="text-xs text-gray-400 font-medium">
                  Conductor: <span className="text-[#F3C966] font-bold">{selectedDriver.fullName}</span>
                </p>
              </div>
              <button
                onClick={() => setAssignModalOpen(false)}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-3 pr-1">
              {pendingRides.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-xs">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-500" />
                  <p className="font-bold">No hay servicios pendientes</p>
                  <p className="text-gray-500 mt-1">Actualmente no hay solicitudes buscando ejecutivo.</p>
                </div>
              ) : (
                pendingRides.map((ride) => (
                  <div
                    key={ride.id}
                    className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 hover:border-[#D4AF37] transition-all space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono font-bold text-[#F3C966]">#{ride.id.slice(-6)}</span>
                      <span className="font-bold text-emerald-400 text-sm">
                        ${(Number(ride.agreedPrice || ride.estimatedPrice || 0)).toLocaleString("es-CO")} COP
                      </span>
                    </div>

                    <div className="text-xs text-gray-300 space-y-1">
                      <p className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#D4AF37]" />
                        <span className="truncate">{ride.pickupAddress || "Origen"}</span>
                      </p>
                      <p className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-red-400" />
                        <span className="truncate">{ride.dropoffAddress || "Destino"}</span>
                      </p>
                    </div>

                    <button
                      onClick={() => handleAssignRide(ride.id)}
                      disabled={assigningRideId === ride.id}
                      className="w-full h-9 mt-2 rounded-xl bg-[#D4AF37] hover:bg-[#F3C966] text-black font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all shadow-[0_0_12px_rgba(212,175,55,0.4)]"
                    >
                      {assigningRideId === ride.id ? (
                        <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Asignar a este Conductor</span>
                        </>
                      )}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
