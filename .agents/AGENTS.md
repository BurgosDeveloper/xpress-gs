# Guía de Diseño, Estética y Desarrollo - Proyecto Xpress Traslados

Esta guía define las reglas estrictas de desarrollo y diseño para la aplicación (backend y frontend) según los requerimientos de crear una experiencia premium, fluida, en tiempo real y altamente visual.

## Reglas de Desarrollo y Arquitectura
1. **Mentalidad de Experto (20+ años):** Cada decisión arquitectónica y de código debe ser robusta, escalable y optimizada. Pensamiento de magister en resolución de problemas.
2. **Automatización:** Todo debe requerir la menor cantidad de pasos posibles para el usuario. Acciones de "un solo click".
3. **Tiempo Real (Sockets):** Priorizar WebSockets (Socket.io) para TODA la interactividad principal (subastas, ofertas, ubicación, chat, notificaciones). Sin recargas, sin esperas, sin polling innecesario.
4. **Formularios Mínimos:** Reemplazar formularios de texto por interfaces visuales interactivas (botones, tarjetas seleccionables, sliders, mapas interactivos). El texto escrito por el usuario debe ser el mínimo absoluto.
5. **Calidad Premium ($20k USD value):** La aplicación no debe verse como un MVP barato. Debe sentirse como una aplicación top del mercado, superando a competidores globales en UX/UI.

## Guía de Estética y Diseño (UI/UX)
1. **Paleta de Colores:**
   - **Primario / Fuerte:** `#0000FF` (Azul puro, vibrante)
   - **Texto y Contraste:** `#FFFFFF` (Blanco)
   - **Fondo / Sombras / Profundidad:** Color Negro y grises muy oscuros.
   - **Acentos:** Detalles estilo Neon para resaltar acciones importantes (botones de aceptar carrera, contraoferta, etc.) usando el `#0000FF` con brillos/glows.
2. **Iconografía:** Uso exclusivo de `Ionicons` u otra librería visual altamente pulida. Reemplazar texto descriptivo por iconos siempre que sea intuitivo.
3. **Animaciones y Fluidez:** Transiciones suaves, micro-interacciones al hacer tap, elementos que aparecen con fade-in o slide. Nada debe aparecer de forma brusca o tosca.
4. **Limpieza Visual:** Ningún elemento debe tapar o estorbar otro elemento importante. Respetar las "Safe Areas". El mapa (Mapbox) debe ser el protagonista y verse limpio.
5. **Elegancia:** Bordes redondeados sutiles, efectos de glassmorphism oscuros sobre el mapa, contrastes fuertes pero agradables a la vista.

## Stack Tecnológico Aprobado
- **Frontend:** React Native, Expo Go (para dev/simulación), Ionicons. Mapbox para mapas.
- **Backend:** Express.js, Neon Postgres (Base de datos), Prisma (ORM), Zod (Validación).
- **Tiempo Real:** Socket.io.
- **Servicios Externos:** Cloudinary (imágenes), Firebase Cloud Messaging (Notificaciones Push), Apple Developer (APN para iOS).
- **Compilación:** Android SDK (Local) / EAS (Producción).

Cualquier agente que trabaje en este proyecto debe leer e implementar estrictamente estas reglas.
