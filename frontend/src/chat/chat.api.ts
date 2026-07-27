import { apiRequest } from "../lib/api";

export interface RideMessage {
  id: string;
  rideId: string;
  senderId: string;
  content: string;
  createdAt: string;
}

export function apiGetRideMessages(token: string, input: { rideId: string }) {
  return apiRequest<{ ok: true; messages: RideMessage[] }>({
    method: "GET",
    path: `/chat/${input.rideId}/messages`,
    token,
  });
}
