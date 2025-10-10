// Better Auth removed. Provide minimal stubs to avoid build-time errors.
export const signIn = {
  social: async () => {
    // No-op: returns resolved promise to avoid crashes
    return Promise.resolve();
  },
} as any;

export const signOut = async () => {};
export const signUp = async () => {
  throw new Error('Sign up disabled');
};

export const useSession = () => ({ data: null, isPending: false } as any);
