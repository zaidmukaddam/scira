import { createClient } from 'redis';

let publisher: ReturnType<typeof createClient> | null = null;
let subscriber: ReturnType<typeof createClient> | null = null;

export function getResumableStreamClients() {
  if (!process.env.REDIS_URL) return null;

  if (!publisher) {
    publisher = createClient({ url: process.env.REDIS_URL });
  }
  if (!subscriber) {
    subscriber = createClient({ url: process.env.REDIS_URL });
  }

  return { publisher, subscriber };
}
