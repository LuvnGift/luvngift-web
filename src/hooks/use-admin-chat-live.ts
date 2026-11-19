'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useSocket } from '@/lib/socket';

/**
 * Live support chat for agents.
 *
 * The API sends these to the `admin` room, which every admin socket joins on
 * connect, so no per-conversation join is needed:
 *  - `admin:chat-message`  a customer follow-up, or another agent's reply
 *  - `admin:chat-seen`     the customer's widget showed the agent's replies
 *  - `admin:chat-presence` the customer arrived on, or left, the site
 *  - `chat:escalated`      a new conversation needs a person
 *
 * The list used to refresh only on a 15-second poll, so a customer's follow-up
 * could sit unseen and an agent could not tell whether anyone was still there.
 * The poll stays as the backstop for a missed event.
 */

const SESSIONS_KEY = ['admin', 'chat', 'sessions'];

interface ChatMessageEvent {
  sessionId?: string;
  message?: { role?: string; content?: string };
}

/** Keeps the support chat list and the open conversation current. */
export function useAdminChatLive(): void {
  const qc = useQueryClient();
  const socket = useSocket();

  useEffect(() => {
    if (!socket) return;
    const refresh = () => void qc.invalidateQueries({ queryKey: SESSIONS_KEY });
    const events = ['admin:chat-message', 'admin:chat-seen', 'admin:chat-presence', 'chat:escalated'];
    events.forEach((e) => socket.on(e, refresh));
    return () => events.forEach((e) => socket.off(e, refresh));
  }, [socket, qc]);
}

/**
 * Toasts a customer's chat message on any admin page except the chat page
 * itself, where it already appears in the conversation.
 */
export function useAdminChatAlerts(onOpen: (sessionId: string) => void, onChatPage: boolean): void {
  const socket = useSocket();

  useEffect(() => {
    if (!socket || onChatPage) return;
    const onMessage = (payload: ChatMessageEvent) => {
      const sessionId = payload?.sessionId;
      if (!sessionId || payload.message?.role !== 'USER') return;
      toast.info('New support chat message', {
        description: payload.message.content?.slice(0, 120),
        action: { label: 'Open', onClick: () => onOpen(sessionId) },
        duration: 15_000,
      });
    };
    const onEscalated = (payload: { sessionId?: string }) => {
      const sessionId = payload?.sessionId;
      if (!sessionId) return;
      toast.info('A customer is asking for a person', {
        action: { label: 'Open', onClick: () => onOpen(sessionId) },
        duration: 15_000,
      });
    };
    socket.on('admin:chat-message', onMessage);
    socket.on('chat:escalated', onEscalated);
    return () => {
      socket.off('admin:chat-message', onMessage);
      socket.off('chat:escalated', onEscalated);
    };
  }, [socket, onOpen, onChatPage]);
}
