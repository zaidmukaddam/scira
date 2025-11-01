// Better Auth removed. Provide minimal stubs to avoid build-time errors.
export const signIn = {
  social: async () => {
    // No-op: social sign-in disabled

    return Promise.resolve();
  },
} as any;

export const signOut = async (options?: {
  fetchOptions?: {
    onRequest?: () => void;
    onSuccess?: () => void;
    onError?: () => void;
  };
}) => {
  options?.fetchOptions?.onRequest?.();
  try {
    // Since there's no backend, we just perform the client-side actions.
    // In a real app, we'd call a '/api/auth/signout' endpoint here.
    if (typeof window !== 'undefined') {
      options?.fetchOptions?.onSuccess?.();
    }
  } catch (error) {
    console.error('Sign out error:', error);
    options?.fetchOptions?.onError?.();
  }
};
export const signUp = async () => {
  throw new Error('Sign up disabled');
};

export const useSession = () => ({ data: null, isPending: false } as any);
