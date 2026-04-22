'use client';

import { useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import type { ChatMessage } from '@luvngift/shared';

interface SendMessageInput {
  sessionId: string;
  message: string;
}

export const useSendChatMessage = () =>
  useMutation<ChatMessage, Error, SendMessageInput>({
    mutationFn: (data) =>
      api.post(`/api/v1/chat/sessions/${data.sessionId}/messages`, { content: data.message }).then((r) => r.data.data),
  });

export const useStartChat = () =>
  useMutation<{ sessionId: string }, Error, void>({
    mutationFn: () =>
      api.post('/api/v1/chat/sessions').then((r) => ({ sessionId: r.data.data.id })),
  });

export const useChatSocket = (sessionId: string | null, onMessage: (msg: ChatMessage) => void) => {
  useEffect(() => {
    if (!sessionId) return;
    const socket = getSocket();
    if (!socket) return;

    socket.emit('chat:join', { sessionId });
    socket.on('chat:message', onMessage);

    return () => {
      socket.off('chat:message', onMessage);
    };
  }, [sessionId, onMessage]);
};
