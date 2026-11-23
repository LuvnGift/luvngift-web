'use client';

import { useCallback, useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useSocket } from '@/lib/socket';
import { ChatMessageRole } from '@luvngift/shared';
import type { ChatMessage } from '@luvngift/shared';
import {
  clearGuestChat,
  clearUserChat,
  readGuestChat,
  readUserChat,
  writeGuestChat,
} from '@/lib/guest-chat';
import type { input } from 'zod';
import type { escalateChatSchema } from '@luvngift/shared';

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
  /** Null once a human owns the conversation: the message is kept for them and the bot stays quiet. */
  message: ChatMessage | null;
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

/**
 * A stored conversation older than this is not resumed. It exists so a guest
 * waiting on a person can come back to the thread, not so a chat from last
 * month greets them on every visit.
 */
const GUEST_CHAT_MAX_IDLE_MS = 3 * 24 * 60 * 60 * 1000;


/** A stored conversation: a guest's (with its key) or a signed-in customer's (cookie auth). */
export interface StoredChat {
  sessionId: string;
  guestKey: string | null;
}

/** Resumes the stored conversation, so a reload or a new visit does not lose the thread. */
export interface ResumedChat {
  session: StoredChat;
  messages: ChatMessage[];
  /** Restored so a reload lands in the right stage rather than back at 'chat'. */
  isEscalated: boolean;
  /** Agent replies the customer has not seen yet: the dot on the closed bubble. */
  unread: number;
}

function storedChatFor(userId: string | null): StoredChat | null {
  if (userId) {
    const sessionId = readUserChat(userId);
    return sessionId ? { sessionId, guestKey: null } : null;
  }
  return readGuestChat();
}

function forgetStoredChat(userId: string | null): void {
  if (userId) clearUserChat();
  else clearGuestChat();
}

/**
 * `readAt` is sent by the API on every message but is not yet on the shared
 * `ChatMessage` type; add it there at the next @luvngift/shared release.
 */
function countUnread(messages: Array<ChatMessage & { readAt?: string | null }>): number {
  return messages.filter((m) => m.role === ChatMessageRole.AGENT && !m.readAt).length;
}

export const useResumeChat = () =>
  useMutation<ResumedChat | null, Error, { userId: string | null }>({
    mutationFn: async ({ userId }) => {
      const stored = storedChatFor(userId);
      if (!stored) return null;
      try {
        const res = await api.get(`/api/v1/chat/sessions/${stored.sessionId}`, {
          headers: guestHeaders(stored.guestKey),
        });
        const data = res.data.data;
        const idleMs = Date.now() - new Date(data.updatedAt).getTime();
        // Resolved by an agent, or long idle: the conversation is over.
        if (data.isResolved || !(idleMs < GUEST_CHAT_MAX_IDLE_MS)) {
          forgetStoredChat(userId);
          return null;
        }
        const messages = data.messages ?? [];
        return {
          session: stored,
          messages,
          isEscalated: Boolean(data.isEscalated),
          unread: countUnread(messages),
        };
      } catch {
        // Session deleted, expired, or no longer ours. Start fresh rather than
        // surfacing an error for something the visitor cannot act on.
        forgetStoredChat(userId);
        return null;
      }
    },
  });

/** The shared escalation body, plus which session and the guest's key (sent as a header). */
export type EscalateInput = input<typeof escalateChatSchema> & { sessionId: string; guestKey?: string | null };

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
): { markSeen: () => void; joined: boolean } => {
  // The instance is replaced when auth state changes; listening on the one that
  // existed at mount means listening on a socket that has been discarded.
  const socket = useSocket();
  // `chat:seen` is ignored until the server has put us in the room, and that
  // join is async (it checks ownership), so wait for its ack.
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    setJoined(false);
    if (!sessionId || !socket) return;

    const join = () =>
      socket.emit('join:chat', sessionId, guestKey ?? undefined, (ok: boolean) => setJoined(ok));

    join();
    // Re-join after a reconnect, or the room membership is silently lost.
    socket.on('connect', join);
    socket.on('chat:message', onMessage);

    const left = () => setJoined(false);
    socket.on('disconnect', left);

    return () => {
      socket.off('connect', join);
      socket.off('disconnect', left);
      socket.off('chat:message', onMessage);
    };
  }, [socket, sessionId, onMessage, guestKey]);

  /**
   * Tells the API the agent's replies were shown, which cancels their email
   * fallback. Call only while the conversation is actually in view.
   */
  const markSeen = useCallback(() => {
    if (socket && sessionId) socket.emit('chat:seen', sessionId);
  }, [socket, sessionId]);

  return { markSeen, joined };
};
