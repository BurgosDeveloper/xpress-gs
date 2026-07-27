import { z } from "zod";

export const GetRideMessagesSchema = z.object({
  rideId: z.string().min(1),
});
