import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/lib/db";
import { config } from 'dotenv';
import { serverEnv } from "@/env/server";

config({
    path: '.env.local',
});

export const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: "pg",
    }),
    socialProviders: {
        github: {
            clientId: serverEnv.GITHUB_CLIENT_ID,
            clientSecret: serverEnv.GITHUB_CLIENT_SECRET,
        },
        google: { 
            clientId: serverEnv.GOOGLE_CLIENT_ID, 
            clientSecret: serverEnv.GOOGLE_CLIENT_SECRET, 
        },
        twitter: { 
            clientId: serverEnv.TWITTER_CLIENT_ID, 
            clientSecret: serverEnv.TWITTER_CLIENT_SECRET, 
        },
    },
    plugins: [nextCookies()],
});