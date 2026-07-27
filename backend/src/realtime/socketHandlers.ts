import { Server, Socket } from 'socket.io';
import { z } from 'zod';
import { prisma } from '../db/prisma';

// Zod schemas para validación estricta de tiempo real (Skill: socket_zod_endpoint)
const LocationUpdateSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

const OfferCreateSchema = z.object({
  rideId: z.string(),
  amount: z.number().optional(),
});

const ChatSendSchema = z.object({
  rideId: z.string(),
  content: z.string().min(1),
});

export function registerSocketHandlers(io: Server, socket: Socket, userId: string) {
  // Manejador de actualización de ubicación (Driver)
  socket.on('driver:location', async (payload: unknown) => {
    try {
      // 1. Zod Parse
      const data = LocationUpdateSchema.parse(payload);
      
      const driver = await prisma.driverProfile.findUnique({
        where: { userId },
      });
      if (!driver) throw new Error('Driver not found');

      // 2. Lógica de Base de datos (Prisma)
      await prisma.driverLocation.upsert({
        where: { driverId: driver.id },
        create: {
          driverId: driver.id,
          lat: data.lat,
          lng: data.lng,
        },
        update: {
          lat: data.lat,
          lng: data.lng,
        },
      });

      // 3. Emitir a la sala de usuarios interesados en este driver
      socket.broadcast.emit(`driver_location:${userId}`, data);

      // 4. Emitir un evento global para que todos los mapas de pasajeros vean el movimiento
      socket.broadcast.emit('driver_location_update', { driverId: driver.id, lat: data.lat, lng: data.lng });

    } catch (error) {
      console.error('Socket validation error [driver:location]:', error);
      socket.emit('error', { event: 'driver:location', message: 'Invalid payload' });
    }
  });

  // Manejador para creación de contraoferta por parte del chofer
  socket.on('offer:create', async (payload: unknown) => {
    try {
      const data = OfferCreateSchema.parse(payload);
      
      const driver = await prisma.driverProfile.findUnique({ where: { userId } });
      if (!driver) throw new Error('Driver not found');

      const candidate = await prisma.rideCandidate.create({
        data: {
          rideId: data.rideId,
          driverId: driver.id,
          status: 'OFFERED',
          amount: data.amount,
        } as any,
        include: { driver: { include: { user: true } } },
      });

      // Emitimos al creador del ride que llegó una nueva oferta/candidato
      const ride = await prisma.rideRequest.findUnique({ where: { id: data.rideId } });
      if (ride) {
        io.to(`user:${ride.passengerId}`).emit('ride:new_offer', candidate);
      }

    } catch (error) {
      console.error('Socket validation error [offer:create]:', error);
      socket.emit('error', { event: 'offer:create', message: 'Invalid payload or server error' });
    }
  });

  // Manejador para envío de mensajes de chat
  socket.on('chat:send', async (payload: unknown) => {
    try {
      const data = ChatSendSchema.parse(payload);
      
      const ride = await prisma.rideRequest.findUnique({
        where: { id: data.rideId },
        include: {
          passenger: { select: { userId: true } },
          matchedDriver: { select: { userId: true } },
        },
      });
      if (!ride) throw new Error('Ride not found');

      const message = await prisma.rideMessage.create({
        data: {
          rideId: data.rideId,
          senderId: userId,
          content: data.content,
        },
      });

      const passengerUserId = ride.passenger?.userId;
      const driverUserId = ride.matchedDriver?.userId;

      // Notificar al pasajero si el sender no es el pasajero
      if (passengerUserId && passengerUserId !== userId) {
        io.to(`user:${passengerUserId}`).emit('chat:message', message);
        import('../modules/notifications/push.service').then(({ sendPushToUser }) => {
          sendPushToUser({
            userId: passengerUserId,
            title: "Nuevo mensaje del conductor",
            body: data.content,
            soundName: "default",
            data: { rideId: ride.id, type: "CHAT_MESSAGE" }
          }).catch(console.error);
        });
      }

      // Notificar al conductor si el sender no es el conductor
      if (driverUserId && driverUserId !== userId) {
        io.to(`user:${driverUserId}`).emit('chat:message', message);
        import('../modules/notifications/push.service').then(({ sendPushToUser }) => {
          sendPushToUser({
            userId: driverUserId,
            title: "Nuevo mensaje del pasajero",
            body: data.content,
            soundName: "default",
            data: { rideId: ride.id, type: "CHAT_MESSAGE" }
          }).catch(console.error);
        });
      }

      // Devolver el mensaje al sender para que sepa que se envió
      socket.emit('chat:message', message);

    } catch (error) {
      console.error('Socket validation error [chat:send]:', error);
      socket.emit('error', { event: 'chat:send', message: 'Invalid payload or server error' });
    }
  });
}
