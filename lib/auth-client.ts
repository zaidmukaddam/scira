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
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'content-type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Unexpected status ${response.status}`);
    }

    const body = await response.json().catch(() => null);
    if (body && !body.success) {
      throw new Error('Logout failed');
    }

    options?.fetchOptions?.onSuccess?.();
  } catch (error) {
    console.error('Sign out error:', error);
    options?.fetchOptions?.onError?.();
  }
};
export const signUp = async () => {
  throw new Error('Sign up disabled');
};

export const useSession = () => ({ data: null, isPending: false } as any);
