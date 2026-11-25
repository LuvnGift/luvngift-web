import { useSyncExternalStore } from 'react';
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

/**
 * One socket per page, whose identity is read on EVERY (re)connect.
 *
 * It used to be created with a fixed token (the 15-minute access token from
 * `/auth/socket-token`), so any reconnect more than 15 minutes in (an API
 * deploy, a laptop waking, a Wi-Fi blip) presented an expired token. The API
 * connects those anonymously, so an admin silently stopped receiving escalated
 * chats and order activity, and a customer stopped receiving live order
 * updates, until a full page load.
 *
 * `getToken` is asked each time the socket connects. Signing in or out calls
 * `reauthenticateSocket()`, which reconnects the SAME instance as the new
 * identity: listeners stay attached, and hooks that join rooms re-join on
 * `connect`. Subscribers are still told when the instance is created or
 * dropped, so use `useSocket()` (not `getSocket()` at mount) in effects.
 */
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

export type SocketTokenSource = () => Promise<string | undefined>;

export const connectSocket = (getToken: SocketTokenSource): Socket => {
  if (socket) return socket;

  socket = io(process.env.NEXT_PUBLIC_SOCKET_URL!, {
    // No token = anonymous (the public chat widget); the API decides the rooms.
    auth: (cb) => {
      getToken()
        .then((token) => cb(token ? { token } : {}))
        .catch(() => cb({}));
    },
    autoConnect: true,
  });
  notify();

  return socket;
};

/** Reconnect as whoever is signed in now. */
export const reauthenticateSocket = (): void => {
  if (!socket) return;
  socket.disconnect();
  socket.connect();
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
 * The current socket, re-rendering when it is created or dropped. Use this,
 * not `getSocket()`, in any effect that attaches listeners or joins rooms, and
 * put it in the effect's dependencies.
 */
export const useSocket = (): Socket | null =>
  useSyncExternalStore(subscribe, getSocket, () => null);
