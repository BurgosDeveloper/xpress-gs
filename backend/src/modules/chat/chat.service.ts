import { prisma } from "../../db/prisma";

export async function getRideMessages(params: { userId: string; rideId: string }) {
  const ride = await prisma.rideRequest.findUnique({
    where: { id: params.rideId },
    select: {
      passengerId: true,
      matchedDriverId: true,
      passenger: { select: { userId: true } },
      matchedDriver: { select: { userId: true } },
    },
  });

  if (!ride) {
    return { ok: false as const, status: 404 as const, error: "Ride not found" };
  }

  // Check if user is either passenger or driver (or admin)
  const isPassenger = ride.passenger?.userId === params.userId || ride.passengerId === params.userId;
  const isDriver = ride.matchedDriver?.userId === params.userId || ride.matchedDriverId === params.userId;

  if (!isPassenger && !isDriver) {
    return { ok: false as const, status: 403 as const, error: "Unauthorized for this ride" };
  }

  const messages = await prisma.rideMessage.findMany({
    where: { rideId: params.rideId },
    orderBy: { createdAt: "asc" },
  });

  return { ok: true as const, messages };
}
