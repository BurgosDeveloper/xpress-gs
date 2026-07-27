# Plan de Desarrollo - Xpress Traslados (Versión Premium $20k)

Este documento contiene los hitos estratégicos (Milestones) para llevar a cabo la reconstrucción y modernización de la plataforma. La ejecución será progresiva, paso a paso, priorizando la arquitectura en tiempo real y la estética Neo-Premium.

## Hito 1: Cimientos Estéticos y Arquitectura UI
- [x] Integración de paleta de colores Neon (`#0000FF`, `#FFFFFF`, Negros profundos).
- [x] Reestructuración de la tipografía y jerarquía visual.
- [x] Creación de la librería interna de componentes (NeonButton, FloatingCard, IconSelectors) usando `Ionicons`.
- [x] Integración de librerías de animación (`react-native-reanimated` y `lottie-react-native`).
- [x] Eliminación progresiva de los TextInput tradicionales a favor de interacciones visuales (tap, slide).

## Hito 2: Motor de Tiempo Real Absoluto (Backend & Frontend)
- [x] Rediseño de los eventos de Socket.io en el backend (Express) para soportar todo el ciclo de vida del traslado sin REST polling.
- [x] Creación de `SocketProvider` global ultra-optimizado en React Native.
- [x] Sincronización de estado instantáneo (Zustand/Context) alimentado por Sockets.
- [x] Refactorización de validación de datos (Zod) tanto en la emisión de sockets como en recepción.

## Hito 3: Experiencia de Mapa "Safe Area" y Clean UI
- [x] Mapbox a pantalla completa con controles flotantes translúcidos (Glassmorphism oscuro).
- [x] Transmisión en tiempo real (Socket) de la posición exacta del conductor hacia el mapa del pasajero, con movimiento interpolado fluido.
- [x] Selección de origen y destino visual sin necesidad de escribir (drag del pin en el mapa).

## Hito 4: Sistema de Subasta y Urgencia
- [ ] Creación de la UI "Ficha del Chofer", con contadores de tiempo regresivos animados (10 segundos).
- [ ] Micro-animaciones en las contraofertas (efecto "impacto" o "glow" al recibir una nueva oferta).
- [ ] Manejo de eventos simultáneos de socket para múltiples conductores pujando.

## Hito 5: Comunicación y Cierre Fluidos
- [x] Integración del chat interno Socket-based (0 recargas).
- [x] Sistema de notificaciones silenciosas por Firebase (FCM) combinadas con alertas interactivas in-app.
- [x] Pantalla de evaluación visual (estrellas deslizables).

## Hito 6: Refinamiento, Testing y Optimización
- [ ] Auditoría de seguridad del backend y validaciones Zod estrictas.
- [ ] Pruebas de concurrencia de conexiones Socket.io.
- [ ] Compilación (Expo EAS / Local Android SDK) y testing visual final en dispositivo físico.
