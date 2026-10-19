'use client';

import { useEffect } from 'react';
import { useQueryClient, type QueryKey } from '@tanstack/react-query';
import { toast } from 'sonner';
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

/**
 * Admin-wide: refresh order data and alert when a CUSTOMER acts on a custom
 * request (message, accept, request changes, decline) — on any admin page.
 *
 * Before this only the open order panel listened, so the orders list kept
 * showing a stale stage and nothing told ops a customer had replied. Events an
 * admin caused (`by: 'ADMIN'`) refresh silently rather than alerting ops about
 * its own message.
 */
export function useAdminOrderActivity(onOpen: (orderId: string) => void) {
  const qc = useQueryClient();
  const socket = useSocket();

  useEffect(() => {
    if (!socket) return;
    const onConversation = (payload: { orderId?: string; by?: 'CUSTOMER' | 'ADMIN' }) => {
      if (!payload?.orderId) return;
      qc.invalidateQueries({ queryKey: ['admin', 'orders'] });
      if (payload.by !== 'CUSTOMER') return;
      const orderId = payload.orderId;
      toast.info(`Customer replied on custom order #${orderId.slice(-8).toUpperCase()}`, {
        action: { label: 'Open', onClick: () => onOpen(orderId) },
        duration: 15_000,
      });
    };
    socket.on('order:conversation', onConversation);
    return () => {
      socket.off('order:conversation', onConversation);
    };
  }, [socket, qc, onOpen]);
}
