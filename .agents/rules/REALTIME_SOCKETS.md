# Reglas de Arquitectura en Tiempo Real y Backend

Estas reglas son obligatorias para el desarrollo del flujo de negocio y backend.

1. **Prioridad Socket.io:** Si una acción requiere que un usuario vea el efecto de inmediato (una oferta, cambio de estado de carrera, movimiento de conductor), SE DEBE usar WebSockets. NO utilizar polling (ej. `setInterval` con fetch).
2. **Cero Esperas:** La UI nunca debe trabarse esperando una respuesta de base de datos para mostrar que algo ocurrió si se puede aplicar Optimistic UI o si la respuesta por socket toma menos de 100ms.
3. **Validación Inquebrantable (Zod):** Todo evento entrante, sea HTTP REST o evento de Socket.io, DEBE pasar por un esquema Zod antes de tocar la base de datos o lógica de negocio.
4. **Resiliencia Socket:** Los clientes deben manejar las desconexiones reconectándose automáticamente sin recargar la pantalla completa. El estado debe sincronizarse silenciosamente en background.
5. **Payloads Ligeros:** Los mensajes enviados por WebSockets solo deben contener los datos modificados o esenciales. Evitar sobrecargar los payloads.
