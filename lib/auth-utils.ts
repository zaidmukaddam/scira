import { auth } from "@/lib/auth";
import { config } from 'dotenv';
import { headers } from "next/headers";
import { User } from "./db/schema";
import {
    sessionCache,
    extractSessionToken,
    createSessionKey,
} from "./performance-cache";

config({
    path: '.env.local',
});

export const getSession = async () => {
    const requestHeaders = await headers();
    const sessionToken = extractSessionToken(requestHeaders);

    // Try cache first (only if we have a session token)
    if (sessionToken) {
        const cacheKey = createSessionKey(sessionToken);
        const cached = sessionCache.get(cacheKey);
        if (cached) {
            return cached;
        }
    }

    const session = await auth.api.getSession({
        headers: requestHeaders
    });

    // Only cache valid sessions with users
    if (sessionToken && session?.user) {
        const cacheKey = createSessionKey(sessionToken);
        sessionCache.set(cacheKey, session);
    }

    return session;
}

export const getUser = async (): Promise<User | null> => {
    const session = await getSession();
    return session?.user as User | null;
}