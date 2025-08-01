// CLIENT-SAFE exports - just types and re-exports of server functions
export type { ComprehensiveUserData } from './user-data-server';

// Clear cache functions can be called from client (they don't access database)
export { clearUserDataCache, clearAllUserDataCache } from './user-data-server';
