"use client";
import PusherClient from 'pusher-js';

const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

export const pusherClient = (typeof window !== 'undefined' && key && cluster)
  ? new PusherClient(key, {
      cluster,
      forceTLS: true,
      channelAuthorization: {
        endpoint: "/api/pusher/auth",
        transport: "ajax",
        withCredentials: true,
      },
      enableLogging: true,
    })
  : (null as unknown as PusherClient);
