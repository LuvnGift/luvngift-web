'use client';

import { useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import type { ChatMessage } from '@luvngift/shared';
import { readGuestChat, writeGuestChat, type GuestChatSession } from '@/lib/guest-chat';

/**
 * Chat works without an account.
 *
 * An anonymous visitor gets a guest session whose key is returned once and
 * stored in `localStorage`. That key is sent in `x-guest-key` on chat requests
 * only — deliberately NOT added to the shared axios interceptor, so a chat
 * credential never rides along on an unrelated request.
 */

const GUEST_KEY_HEADER = 'x-guest-key';

/** Header bag for the current actor: empty when signed in (the cookie carries it). */
function guestHeaders(guestKey?: string | null): Record<string, string> {
  return guestKey ? { [GUEST_KEY_HEADER]: guestKey } : {};
}

interface SendMessageInput {
  sessionId: string;
  message: string;
  guestKey?: string | null;
}

/**
 * The server reports session state explicitly. The widget used to infer it by
 * regex-matching the bot's own wording, which broke as soon as the copy
 * changed — an escalation went unnoticed and the next message came back as
 * "Session is with a human agent".
 */
export interface ChatReply {
  message: ChatMessage;
  escalated: boolean;
  needsContact: boolean;
}

export const useSendChatMessage = () =>
  useMutation<ChatReply, Error, SendMessageInput>({
    mutationFn: (data) =>
      api
        .post(
          `/api/v1/chat/sessions/${data.sessionId}/messages`,
          { content: data.message },
          { headers: guestHeaders(data.guestKey) },
        )
        .then((r) => r.data.data),
  });

export interface StartedChat {
  sessionId: string;
  /** Present only for a guest session. Persisted immediately — it is unrecoverable. */
  guestKey: string | null;
}

export const useStartChat = () =>
  useMutation<StartedChat, Error, void>({
    mutationFn: async () => {
      const res = await api.post('/api/v1/chat/sessions');
      const started: StartedChat = {
        sessionId: res.data.data.id,
        guestKey: res.data.data.guestKey ?? null,
      };
      if (started.guestKey) {
        writeGuestChat({ sessionId: started.sessionId, guestKey: started.guestKey });
      }
      return started;
    },
  });

/** Resumes the stored guest conversation, so a reload does not lose the thread. */
export const useResumeGuestChat = () =>
  useMutation<{ session: GuestChatSession; messages: ChatMessage[] } | null, Error, void>({
    mutationFn: async () => {
      const stored = readGuestChat();
      if (!stored) return null;
      try {
        const res = await api.get(`/api/v1/chat/sessions/${stored.sessionId}`, {
          headers: guestHeaders(stored.guestKey),
        });
        return { session: stored, messages: res.data.data.messages ?? [] };
      } catch {
        // Session deleted, expired, or the key no longer matches. Start fresh
        // rather than surfacing an error for something the visitor cannot act on.
        return null;
      }
    },
  });

export interface EscalateInput {
  sessionId: string;
  guestKey?: string | null;
  /** Required for guests — the API rejects the request without them. */
  name?: string;
  email?: string;
}

export const useEscalateChat = () =>
  useMutation<void, Error, EscalateInput>({
    mutationFn: ({ sessionId, guestKey, name, email }) =>
      api
        .post(
          `/api/v1/chat/sessions/${sessionId}/escalate`,
          { name, email },
          { headers: guestHeaders(guestKey) },
        )
        .then(() => undefined),
  });

/**
 * Subscribes to live messages for a session.
 *
 * The event name and payload were both wrong: this emitted `chat:join` with
 * `{ sessionId }`, while the server listens for `join:chat` with a bare string.
 * So the client never joined the room and an agent's reply never arrived — for
 * signed-in customers too, not just guests. Live chat only looked like it
 * worked because the bot's reply comes back in the POST response.
 */
export const useChatSocket = (
  sessionId: string | null,
  onMessage: (msg: ChatMessage) => void,
  guestKey?: string | null,
) => {
  useEffect(() => {
    if (!sessionId) return;
    const socket = getSocket();
    if (!socket) return;

    const join = () => socket.emit('join:chat', sessionId, guestKey ?? undefined);

    join();
    // Re-join after a reconnect, or the room membership is silently lost.
    socket.on('connect', join);
    socket.on('chat:message', onMessage);

    return () => {
      socket.off('connect', join);
      socket.off('chat:message', onMessage);
    };
  }, [sessionId, onMessage, guestKey]);
};
