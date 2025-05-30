import { auth } from "@/lib/auth";
import { config } from 'dotenv';
import { headers } from "next/headers";
import { User } from "./db/schema";

config({
    path: '.env.local',
});

export const getSession = async () => {
    const session = await auth.api.getSession({
        headers: await headers()
    })

    return session;
}

export const getUser = async () => {
    const session = await getSession();
    return session?.user as User | null;
}