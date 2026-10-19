import { useSyncExternalStore } from 'react';
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

/**
 * The socket INSTANCE is replaced, not just reconnected: `providers.tsx`
 * connects anonymously first and swaps in an authenticated socket once the
 * socket token arrives (and back again on logout). A component that read
 * `getSocket()` once at mount kept listening on the discarded anonymous socket —
 * which cannot join order rooms — so live updates silently never arrived.
 * Subscribers are told whenever the instance changes; `useSocket()` re-renders.
 */
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

export const connectSocket = (token?: string): Socket => {
  if (socket?.connected) return socket;

  socket = io(process.env.NEXT_PUBLIC_SOCKET_URL!, {
    // Token is optional: authenticated users pass one (joins their personal/admin
    // rooms); guests connect anonymously (e.g. for the public chat widget).
    auth: token ? { token } : {},
    autoConnect: true,
  });
  notify();

  return socket;
};

export const disconnectSocket = (): void => {
  socket?.disconnect();
  socket = null;
  notify();
};

export const getSocket = (): Socket | null => socket;

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/**
 * The current socket, re-rendering when it is replaced. Use this — not
 * `getSocket()` — in any effect that attaches listeners or joins rooms, and put
 * it in the effect's dependencies.
 */
export const useSocket = (): Socket | null =>
  useSyncExternalStore(subscribe, getSocket, () => null);
