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
      headers: {
        // cookies won't auto-send cross-origin via pusher's ajax — send token explicitly
      },
      customHandler: async ({ socketId, channelName }, callback) => {
        try {
          const res = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/realtime/auth`,
            {
              method: "POST",
              credentials: "include", 
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: new URLSearchParams({ socket_id: socketId, channel_name: channelName }),
            },
          );

          if (!res.ok) throw new Error("Auth failed");

          const data = await res.json();
          callback(null, data);
        } catch (err) {
          callback(new Error("Pusher auth failed"), null);
        }
      },
    },
  });

  return pusher;
}