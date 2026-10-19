'use client';

import { useEffect } from 'react';
import { useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useSocket } from '@/lib/socket';

/**
 * Keeps an order's queries fresh while its page is open.
 *
 * The server's event is `join:order` and takes a BARE order id. The customer
 * order page used to emit `order:join` with `{ orderId }`, so it never joined
 * the room and no live status update ever arrived — the same bug the chat
 * widget had with `join:chat`. Re-joins on every (re)connect, because room
 * membership does not survive a reconnect.
 *
 * Admin sockets are in every order's broadcasts via the `admin` room, so the
 * join is only needed for customers, but it is harmless for admins.
 */
export function useOrderLive(
  orderId: string | null | undefined,
  queryKeys: QueryKey[],
  onStatus?: (status: string) => void,
) {
  const qc = useQueryClient();
  const keys = JSON.stringify(queryKeys);
  // Re-runs when the socket instance is swapped (anonymous → authenticated).
  const socket = useSocket();

  useEffect(() => {
    if (!socket || !orderId) return;

    const join = () => socket.emit('join:order', orderId);
    const refresh = (payload: { orderId?: string }) => {
      if (payload?.orderId !== orderId) return;
      for (const key of JSON.parse(keys) as QueryKey[]) qc.invalidateQueries({ queryKey: key });
    };
    const status = (payload: { orderId?: string; status?: string }) => {
      if (payload?.orderId !== orderId) return;
      refresh(payload);
      if (payload.status) onStatus?.(payload.status);
    };

    join();
    socket.on('connect', join);
    socket.on('order:conversation', refresh);
    socket.on('order:status', status);
    return () => {
      socket.off('connect', join);
      socket.off('order:conversation', refresh);
      socket.off('order:status', status);
    };
  }, [socket, orderId, keys, qc, onStatus]);
}
