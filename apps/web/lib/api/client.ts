'use client';

import { useAuthStore } from '../store/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function refreshAccessToken(): Promise<string | null> {
  const res = await fetch(`${API_URL}/auth/refresh`, { method: 'POST', credentials: 'include' });
  if (!res.ok) return null;
  const data = await res.json();
  return data.accessToken as string;
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  const { auth = true, headers, ...rest } = options;
  const token = useAuthStore.getState().accessToken;

  const doFetch = async (bearer: string | null) =>
    fetch(`${API_URL}${path}`, {
      ...rest,
      credentials: 'include',
      headers: {
        ...(rest.body ? { 'Content-Type': 'application/json' } : {}),
        ...(auth && bearer ? { Authorization: `Bearer ${bearer}` } : {}),
        ...headers,
      },
    });

  let res = await doFetch(token);

  if (res.status === 401 && auth) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      const user = useAuthStore.getState().user;
      if (user) useAuthStore.getState().setAuth(newToken, user);
      res = await doFetch(newToken);
    } else {
      useAuthStore.getState().clear();
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    throw new ApiError(res.status, body.message ?? 'Request failed');
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export { API_URL };
