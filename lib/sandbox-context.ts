import 'server-only';
import { AsyncLocalStorage } from 'node:async_hooks';

const storage = new AsyncLocalStorage<string>();

export function runWithChatId<T>(chatId: string, fn: () => T): T {
  return storage.run(chatId, fn);
}

export function getCurrentChatId(): string | undefined {
  return storage.getStore();
}
