import { createAuthClient } from "better-auth/react";
import { config } from 'dotenv';

config({
    path: '.env.local',
});

export const authClient = createAuthClient();

export const { signIn, signOut, signUp, useSession } = authClient;