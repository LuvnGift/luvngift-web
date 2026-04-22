'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, Bot, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { useAuthStore } from '@/store/auth.store';
import { useSendChatMessage, useStartChat, useChatSocket } from '@/hooks/use-chat';
import { ChatMessageRole } from '@luvngift/shared';
import type { ChatMessage } from '@luvngift/shared';
import { cn } from '@/lib/utils';

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { user } = useAuthStore();
  const { mutateAsync: startChat, isPending: starting } = useStartChat();
  const { mutateAsync: sendMessage, isPending: sending } = useSendChatMessage();

  const handleIncomingMessage = useCallback((msg: ChatMessage) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  useChatSocket(sessionId, handleIncomingMessage);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const openChat = async () => {
    setIsOpen(true);
    if (!sessionId && user) {
      try {
        const { sessionId: sid } = await startChat();
        setSessionId(sid);
        setMessages([{
          id: 'welcome',
          sessionId: sid,
          role: ChatMessageRole.BOT,
          content: `Hi ${user.username}! I'm here to help. Ask me anything about your orders, our products, or delivery to Nigeria.`,
          createdAt: new Date(),
        } as ChatMessage]);
        // Focus input after session is ready
        setTimeout(() => inputRef.current?.focus(), 100);
      } catch {
        // handled silently — user can still see the UI
      }
    } else {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !sessionId) return;
    const userMessage = input.trim();
    setInput('');

    // Optimistic user message
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        sessionId: sessionId!,
        role: ChatMessageRole.USER,
        content: userMessage,
        createdAt: new Date(),
      } as ChatMessage,
    ]);

    try {
      const response = await sendMessage({ sessionId: sessionId!, message: userMessage });
      setMessages((prev) => [...prev, response]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString() + '-err',
          sessionId: sessionId!,
          role: ChatMessageRole.BOT,
          content: 'Sorry, I had trouble responding. Please try again.',
          createdAt: new Date(),
        } as ChatMessage,
      ]);
    }
  };

  if (!user) return null;

  return (
    <>
      {/* Floating button */}
      {!isOpen && (
        <button
          onClick={openChat}
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors"
          aria-label="Open chat"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {/* Chat panel */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 flex w-80 sm:w-96 flex-col rounded-xl border bg-background shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between rounded-t-xl bg-primary px-4 py-3">
            <div className="flex items-center gap-2 text-primary-foreground">
              <Bot className="h-5 w-5" />
              <div>
                <p className="text-sm font-semibold">Support</p>
                <p className="text-xs opacity-80">We typically reply instantly</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-primary-foreground/80 hover:text-primary-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-80 min-h-[200px]">
            {starting && (
              <div className="flex justify-center">
                <Spinner size="sm" />
              </div>
            )}
            {messages.map((msg) => {
              const isUser = msg.role === ChatMessageRole.USER;
              return (
                <div
                  key={msg.id}
                  className={cn('flex gap-2', isUser ? 'flex-row-reverse' : 'flex-row')}
                >
                  <div className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                    isUser ? 'bg-primary text-primary-foreground' : 'bg-muted',
                  )}>
                    {isUser ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                  </div>
                  <div
                    className={cn(
                      'max-w-[75%] rounded-2xl px-3 py-2 text-sm',
                      isUser
                        ? 'bg-primary text-primary-foreground rounded-tr-sm'
                        : 'bg-muted rounded-tl-sm',
                    )}
                  >
                    {msg.content}
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t p-3 flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder={sessionId ? 'Type a message...' : 'Starting chat...'}
              disabled={sending || !sessionId}
              className="text-sm"
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={sending || !input.trim() || !sessionId}
            >
              {sending ? <Spinner size="sm" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
