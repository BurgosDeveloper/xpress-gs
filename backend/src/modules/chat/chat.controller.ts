import { Request, Response } from "express";
import { GetRideMessagesSchema } from "./chat.schemas";
import { getRideMessages } from "./chat.service";

export async function getRideMessagesController(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const parsed = GetRideMessagesSchema.parse({ rideId: req.params.rideId });

  const result = await getRideMessages({ userId, rideId: parsed.rideId });
  if (!result.ok) return res.status(result.status).json({ message: result.error });

  return res.status(200).json(result);
}
