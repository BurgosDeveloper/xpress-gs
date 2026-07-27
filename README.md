# ⚡ Xpress Traslados — Plataforma Premium de Movilidad en Tiempo Real

> **Xpress Traslados** es una solución tecnológica integral de transporte y traslados ejecutivos/urbanos construida con arquitectura modular de alto rendimiento, subastas de carreras en tiempo real, geolocalización avanzada e interfaz visual ultramoderna.

---

## 🌟 Características Principales

- **⚡ Subastas & Ofertas en Tiempo Real:** Pasajeros y conductores negocian tarifas en tiempo real mediante WebSockets (Socket.io) con mínimo delay y actualización instantánea.
- **🗺️ Geolocalización Interactiva con Mapbox:** Mapa en tiempo real con marcadores animados, trazado de rutas óptimas (OSRM/Mapbox) y seguimiento del chofer.
- **⭐ Sistema de Calificación y Retención de Servicio:** Obligatoriedad de puntuar al chofer post-carrera para mantener la calidad del servicio y liquidación automática de comisión.
- **💬 Chat Integrado en Tiempo Real:** Chat bidireccional entre chofer y cliente con indicadores de mensajes no leídos en la interfaz.
- **🔔 Notificaciones Push con Sonidos Personalizados:** Integración dual nativa con Apple Push Notification service (APNs) para iOS y Firebase Cloud Messaging (FCM) para Android.
- **☁️ Gestión de Multimedia con Cloudinary:** Carga fluida de fotos de perfil y documentos de vehículos directo a la nube.
- **🎨 Experiencia Visual Premium:** Interfaz basada en estándares Neon & Glassmorphism, paleta vibrante (`#0000FF` / Neon Gold), iconografía Ionicons y cero formularios redundantes.

---

## 🛠️ Stack Tecnológico

### 📱 Frontend (Aplicación Móvil)
- **Framework:** React Native / Expo (Bare Workflow)
- **Mapas & Ruteo:** `@rnmapbox/maps` & OSRM API
- **Estilos & UI:** StyleSheet API con diseño Neon/Dark Mode & Ionicons
- **Tiempo Real:** `socket.io-client`
- **Almacenamiento Local:** `expo-secure-store` & AsyncStorage
- **Package Name:** `com.xpress.sc`

### ⚙️ Backend (Servidor & API)
- **Entorno:** Node.js + TypeScript (Express.js)
- **Base de Datos:** PostgreSQL en **Neon (Serverless DB)**
- **ORM:** Prisma ORM
- **Sockets:** `socket.io`
- **Validación:** Zod
- **Almacenamiento:** Cloudinary SDK
- **Notificaciones Push:** `@parse/apn` (APNs Apple) & `firebase-admin` (Android)
- **Despliegue:** Railway (Nixpacks NixOS Build System)

---

## 📂 Estructura del Proyecto

```text
xpress-traslados/
├── backend/                  # Servidor API REST & WebSocket Gateways
│   ├── prisma/               # Esquema de Base de Datos & Migraciones
│   ├── src/
│   │   ├── controllers/      # Controladores de la API
│   │   ├── integrations/     # Cloudinary, Firebase, APNs
│   │   ├── modules/          # Módulos de viajes, calificaciones, chat
│   │   ├── realtimes/        # Gateway de Socket.io
│   │   └── server.ts         # Punto de entrada del servidor
│   └── package.json
├── frontend/                 # Aplicación Móvil React Native
│   ├── android/              # Configuración nativa de Android (Gradle)
│   ├── ios/                  # Configuración nativa de iOS (Xcode)
│   ├── src/                  # Componentes, pantallas, hooks y contexto
│   ├── assets/               # Recursos gráficos (logos, íconos y audios)
│   └── app.json              # Configuración de Expo
├── export/                   # Binarios de producción generados (.apk / .aab)
├── nixpacks.toml             # Configuración de Despliegue en Railway
└── README.md
```

---

## 🚀 Guía de Instalación y Desarrollo Local

### Prerrequisitos
- Node.js v20.x o superior
- npm v10.x
- Android Studio / Android SDK (para compilación local de Android)
- Xcode (opcional, para iOS)

### 1. Clonar el repositorio
```bash
git clone https://github.com/BurgosDeveloper/xpress-gs.git
cd xpress-gs
```

### 2. Configurar el Backend
```bash
cd backend
npm install
cp .env.example .env
```
> Ajusta las variables en `.env` (Database URL, JWT Secret, Cloudinary, APNs).

Ejecutar las migraciones e iniciar en modo desarrollo:
```bash
npx prisma db push
npm run dev
```

### 3. Configurar la Aplicación Móvil
```bash
cd ../frontend
npm install
cp .env.example .env
```
> Establece la URL de tu servidor en `EXPO_PUBLIC_API_BASE_URL`.

---

## 📦 Compilación de Producción (Android)

Para generar el **APK** (instalación directa) y **AAB** (Google Play Store):

```bash
cd frontend
# Actualiza los íconos nativos
node update_android_icons.js

# Compila e instala la exportación automática
.\android\gradlew.bat assembleRelease bundleRelease
node export_builds.js
```

Los artefactos resultantes se ubicarán en `export/`:
- `export/xpress-v1.0.24.apk`
- `export/xpress-v1.0.24.aab`

---

## ☁️ Despliegue en Producción (Railway)

Este repositorio está preconfigurado con `nixpacks.toml` para ser desplegado automáticamente en **Railway**:

1. Conecta el repositorio `BurgosDeveloper/xpress-gs` en Railway.
2. Agrega las variables de entorno especificadas en `backend/.env.example`.
3. Railway compilará e iniciará el backend automáticamente en HTTPS.

---

## 🔒 Licencia y Autoría

Desarrollado para **Xpress Traslados** — Todos los derechos reservados.
