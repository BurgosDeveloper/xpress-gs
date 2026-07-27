---
name: socket_zod_endpoint
description: Construye y valida eventos o endpoints del backend usando Socket.io y Zod para garantizar tiempo real y tipado estricto.
---

# Instrucciones
Cuando necesites crear lógica de negocio en el backend que involucre sockets, sigue estos pasos:

1. **Definir el Esquema Zod:** En la carpeta de esquemas o en el mismo módulo, define un esquema estricto (e.g. `const OfferSchema = z.object({...})`).
2. **Validar Evento Socket:** Dentro del listener del socket (`socket.on('evento', (data) => {...})`), realiza un `.parse()` o `.safeParse()` del esquema Zod.
3. **Lógica Asíncrona Limpia:** Interactúa con la base de datos (Prisma) usando async/await.
4. **Emitir Respuesta a los Interesados:** Utiliza `io.to(roomId).emit(...)` o `socket.broadcast.to(...)` para notificar del cambio de estado a otros usuarios conectados inmediatamente.
5. **No Bloquear:** Asegúrate de capturar los errores y responder al socket origen con un evento de error, en lugar de crashear el servidor.
