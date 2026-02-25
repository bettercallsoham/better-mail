"use client";

import Pusher from "pusher-js";

let pusher: Pusher | null = null;

export function getPusherClient() {
  if (pusher) return pusher;

  pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
    cluster: "mt1",
    wsHost: process.env.NEXT_PUBLIC_SOKETI_HOST,
    wsPort: 443,
    wssPort: 443,
    forceTLS: true,
    enabledTransports: ["ws", "wss"],

    channelAuthorization: {
      endpoint: `${process.env.NEXT_PUBLIC_API_URL}/realtime/auth`,
      transport: "ajax",
    },
  });

  return pusher;
}
