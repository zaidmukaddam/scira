import { createAuthClient } from "better-auth/react";
import { organizationClient } from "better-auth/client/plugins";
import { polarClient } from "@polar-sh/better-auth";


export const authClient = createAuthClient({
  plugins: [organizationClient(), polarClient()],
});

export const { signIn, signOut, signUp, useSession } = authClient;