"use client";
import PusherClient from 'pusher-js';

export const pusherClient = typeof window !== 'undefined'
  ? new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY as string, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
      forceTLS: true,
      channelAuthorization: {
        endpoint: "/api/pusher/auth",
        transport: "ajax",
        withCredentials: true,
      },
    })
  : (null as unknown as PusherClient);
