import { useState, useEffect } from 'react';

// Famasi API authentication client
class FamasiAuthClient {
  private baseURL: string;
  private apiKey: string;

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_FAMASI_API_URL || 'https://api.famasi.me';
    this.apiKey = process.env.NEXT_PUBLIC_FAMASI_API_KEY || '';
  }

  async signIn(email: string, password: string) {
    const response = await fetch(`${this.baseURL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      throw new Error('Authentication failed');
    }

    const data = await response.json();
    localStorage.setItem('famasi_token', data.token);
    localStorage.setItem('famasi_user', JSON.stringify(data.user));
    return data;
  }

  async signUp(email: string, password: string, name: string) {
    const response = await fetch(`${this.baseURL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ email, password, name }),
    });

    if (!response.ok) {
      throw new Error('Registration failed');
    }

    const data = await response.json();
    return data;
  }

  async requestOTP(email: string) {
    const response = await fetch(`${this.baseURL}/auth/otp/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      throw new Error('OTP request failed');
    }

    return await response.json();
  }

  async verifyOTP(email: string, otp: string) {
    const response = await fetch(`${this.baseURL}/auth/otp/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ email, otp }),
    });

    if (!response.ok) {
      throw new Error('OTP verification failed');
    }

    const data = await response.json();
    localStorage.setItem('famasi_token', data.token);
    localStorage.setItem('famasi_user', JSON.stringify(data.user));
    return data;
  }

  async signOut() {
    localStorage.removeItem('famasi_token');
    localStorage.removeItem('famasi_user');
  }

  getSession() {
    const token = localStorage.getItem('famasi_token');
    const user = localStorage.getItem('famasi_user');
    
    if (!token || !user) {
      return null;
    }

    return {
      token,
      user: JSON.parse(user),
    };
  }
}

export const authClient = new FamasiAuthClient();

// React hook for session management
export function useSession() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const currentSession = authClient.getSession();
    setSession(currentSession);
    setLoading(false);
  }, []);

  return { data: session, loading };
}

// Export auth methods
export const signIn = authClient.signIn.bind(authClient);
export const signOut = authClient.signOut.bind(authClient);
export const signUp = authClient.signUp.bind(authClient);
export const requestOTP = authClient.requestOTP.bind(authClient);
export const verifyOTP = authClient.verifyOTP.bind(authClient);
