# Reglas de Flujos de Procesos y Funcionamiento de Servicios

Este documento define la arquitectura y las reglas de negocio estrictas para la creación, consulta y gestión de solicitudes de traslado, delivery y envíos en **Xpress Traslados**.

---

## 1. Consulta de Detalles y Autorización Backend (`/rides/:id`)
- **Visualización para Choferes:** Cualquier chofer activo puede consultar los detalles de solicitudes abiertas (`OPEN`, `REQUESTED`, `OFFERED`), así como carreras asignadas a su perfil (`matchedDriver`).
- **Seguridad:** El backend nunca debe retornar `403 Forbidden` ni `404 Ride not found` a un chofer que intente ver los detalles de una carrera disponible para ofertar o realizar.

---

## 2. Minimapas y Datos de Ubicación Visibles
- **Tarjeta de Inicio del Pasajero (Servicio Activo):**
  - Debe mostrar un minimapa (Mapbox / `AppMap`) con el marcador del punto A (recogida/origen en dorado) y punto B (entrega/destino en rojo).
  - Debe mostrar la dirección formateada legible (ej. "Barrio Obrero, Calle 10").
  - Ubicado justo arriba de los botones de acción ("Detalles", "Chat", etc.).

- **Tarjetas de Inicio del Chofer (Servicios Cercanos):**
  - Cada tarjeta de servicio solicitado debe incluir un thumbnail del minimapa con los marcadores de origen y destino.
  - La tarjeta entera es interactiva (`Pressable`) y abre la pantalla de detalles al tocarla.
  - Muestra dirección de origen (`pickupAddress` / `pickupText`) y destino (`dropoffAddress` / `dropoffText`).

- **Pantalla de Detalle de Oferta / Detalle del Viaje (`DriverOfferDetailsScreen` / `RideDetailsScreen`):**
  - Incluye minimapa interactivo superior con ajuste de cámara (`fitToCoordinates`) mostrando la ruta trazada entre origen y destino.
  - Información 100% útil para el chofer/cliente: Nombre, Teléfono, Origen, Destino, Precio, Distancia y Vehículo.
  - **Cero Jerga de Programador:** Queda prohibido mostrar IDs internos (`cuid`), fragmentos de objetos JSON crudos o estados técnicos de base de datos sin traducir.

---

## 3. Dinámica de Contraofertas y Aceptación
- El chofer puede enviar una propuesta de tarifa ajustando el monto en incrementos sencillos (+1k / -1k COP).
- Al presionar "¡Voy!" o "Enviar oferta", la postulación se registra mediante la API / WebSockets y se notifica al pasajero al instante.

---

## 4. Estética Neon y Experiencia Premium
- Mantener la paleta oficial (Dorado Oro `#D4AF37`, Fondo Oscuro `#241D00`, Cristal `rgba(12, 12, 10, 0.85)`).
- Bordes redondeados sutiles, microinteracciones rápidas y cero bloqueos de pantalla.
