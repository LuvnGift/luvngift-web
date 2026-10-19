'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, Bot, User, Headset, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { useAuthStore } from '@/store/auth.store';
import {
  useSendChatMessage,
  useStartChat,
  useChatSocket,
  useResumeGuestChat,
  useEscalateChat,
} from '@/hooks/use-chat';
import { ChatMessageRole } from '@luvngift/shared';
import type { ChatMessage } from '@luvngift/shared';
import { cn } from '@/lib/utils';
import { clearGuestChat } from '@/lib/guest-chat';

/**
 * Support chat, available without an account.
 *
 * It used to show a sign-in wall to anyone logged out, which meant the people
 * most likely to have pre-sales questions — first-time visitors deciding
 * whether to trust us with a gift to Nigeria — were the only ones who could not
 * ask one.
 *
 * A guest's conversation is owned by a key held in `localStorage`; see
 * `lib/guest-chat.ts`. Contact details are asked for at exactly one moment:
 * when they want a human. That is not lead capture dressed as support — a guest
 * who closes the tab has no session and no socket, so without an email there is
 * no way to answer them at all.
 */

type Stage = 'chat' | 'contact' | 'handed-over';

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [guestKey, setGuestKey] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [stage, setStage] = useState<Stage>('chat');
  const [contact, setContact] = useState({ name: '', email: '' });
  const [contactError, setContactError] = useState<string | null>(null);
  const [confirmingClose, setConfirmingClose] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { user } = useAuthStore();
  const { mutateAsync: startChat, isPending: starting } = useStartChat();
  const { mutateAsync: sendMessage, isPending: sending } = useSendChatMessage();
  const { mutateAsync: resumeGuestChat } = useResumeGuestChat();
  const { mutateAsync: escalate, isPending: escalating } = useEscalateChat();

  const handleIncomingMessage = useCallback((msg: ChatMessage) => {
    setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
  }, []);

  useChatSocket(sessionId, handleIncomingMessage, guestKey);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, stage]);

  const greeting = user
    ? `Hi ${user.username}! Ask me anything about our gifts, delivery to Nigeria, or how subscriptions work.`
    : 'Hi! Ask me anything about our gifts, delivery to Nigeria, or how it all works. I can get a person for you at any point.';

  const begin = useCallback(async () => {
    // A returning guest keeps their thread. Signed-in users get a fresh session,
    // as before — their history lives in their account.
    if (!user) {
      const resumed = await resumeGuestChat();
      if (resumed) {
        setSessionId(resumed.session.sessionId);
        setGuestKey(resumed.session.guestKey);
        setMessages(resumed.messages);
        if (resumed.isEscalated) setStage('handed-over');
        return;
      }
    }
    try {
      const started = await startChat();
      setSessionId(started.sessionId);
      setGuestKey(started.guestKey);
      setMessages([
        {
          id: 'welcome',
          sessionId: started.sessionId,
          role: ChatMessageRole.BOT,
          content: greeting,
          createdAt: new Date(),
        } as ChatMessage,
      ]);
    } catch {
      setMessages([
        {
          id: 'start-error',
          sessionId: 'none',
          role: ChatMessageRole.BOT,
          content:
            'Sorry — I could not start a chat just now. Please try again, or email info@luvngift.com.',
          createdAt: new Date(),
        } as ChatMessage,
      ]);
    }
  }, [user, resumeGuestChat, startChat, greeting]);

  const openChat = useCallback(async () => {
    setIsOpen(true);
    if (!sessionId) await begin();
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [sessionId, begin]);

  // Opened from the footer link and any other external trigger.
  useEffect(() => {
    const handler = () => void openChat();
    window.addEventListener('chat:open', handler);
    return () => window.removeEventListener('chat:open', handler);
  }, [openChat]);

  async function handleSend() {
    if (!input.trim() || !sessionId) return;
    const text = input.trim();
    setInput('');

    setMessages((prev) => [
      ...prev,
      {
        id: `local-${Date.now()}`,
        sessionId,
        role: ChatMessageRole.USER,
        content: text,
        createdAt: new Date(),
      } as ChatMessage,
    ]);

    try {
      const reply = await sendMessage({ sessionId, message: text, guestKey });
      const botMessage = reply.message;
      if (botMessage) setMessages((prev) => [...prev, botMessage]);
      // Driven by the server's flags, never by the wording of the reply.
      if (reply.needsContact) setStage('contact');
      else if (reply.escalated) setStage('handed-over');
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sessionId,
          role: ChatMessageRole.BOT,
          content: 'Sorry, I had trouble responding. Please try again.',
          createdAt: new Date(),
        } as ChatMessage,
      ]);
    }
  }

  /**
   * Closing asks whether to keep the conversation. A guest's chat is stored in
   * this browser so they can return to an agent's reply, but nothing ever ended
   * it — the same thread reappeared on every visit, with no way out.
   */
  function handleClose() {
    const hasConversation = messages.some((m) => m.role === ChatMessageRole.USER);
    if (hasConversation) setConfirmingClose(true);
    else setIsOpen(false);
  }

  function keepForLater() {
    setConfirmingClose(false);
    setIsOpen(false);
  }

  function endChat() {
    clearGuestChat();
    setSessionId(null);
    setGuestKey(null);
    setMessages([]);
    setStage('chat');
    setInput('');
    setContact({ name: '', email: '' });
    setContactError(null);
    setConfirmingClose(false);
    setIsOpen(false);
  }

  async function requestHuman() {
    if (!sessionId) return;
    if (!user) {
      setStage('contact');
      return;
    }
    await escalate({ sessionId });
    setStage('handed-over');
  }

  async function submitContact() {
    if (!sessionId) return;
    setContactError(null);
    try {
      await escalate({ sessionId, guestKey, name: contact.name, email: contact.email });
      setStage('handed-over');
    } catch (err) {
      const message = (err as { response?: { data?: { error?: { message?: string } } } })?.response
        ?.data?.error?.message;
      setContactError(message ?? 'Could not send that. Please check your details and try again.');
    }
  }

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => void openChat()}
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-colors hover:bg-primary/90"
          aria-label="Chat with us"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {isOpen && (
        <div className="fixed bottom-6 right-6 left-6 z-50 flex flex-col rounded-xl border bg-background shadow-2xl sm:left-auto sm:w-96">
          <div className="flex items-center justify-between rounded-t-xl bg-primary px-4 py-3">
            <div className="flex items-center gap-2 text-primary-foreground">
              <Bot className="h-5 w-5" />
              <div>
                <p className="text-sm font-semibold">Support</p>
                <p className="text-xs opacity-80">
                  {stage === 'handed-over' ? 'A person will reply' : 'We typically reply instantly'}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="text-primary-foreground/80 transition-colors hover:text-primary-foreground"
              aria-label="Close chat"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="max-h-80 min-h-[200px] flex-1 space-y-3 overflow-y-auto p-4">
            {starting && (
              <div className="flex justify-center">
                <Spinner size="sm" />
              </div>
            )}

            {messages.map((msg) => {
              const isUser = msg.role === ChatMessageRole.USER;
              const isAgent = msg.role === ChatMessageRole.AGENT;
              return (
                <div
                  key={msg.id}
                  className={cn('flex gap-2', isUser ? 'flex-row-reverse' : 'flex-row')}
                >
                  <div
                    className={cn(
                      'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                      isUser
                        ? 'bg-primary text-primary-foreground'
                        : isAgent
                          ? 'bg-green-100 text-green-800'
                          : 'bg-muted',
                    )}
                  >
                    {isUser ? (
                      <User className="h-3.5 w-3.5" />
                    ) : isAgent ? (
                      <Headset className="h-3.5 w-3.5" />
                    ) : (
                      <Bot className="h-3.5 w-3.5" />
                    )}
                  </div>
                  <div
                    className={cn(
                      'max-w-[75%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm',
                      isUser
                        ? 'rounded-tr-sm bg-primary text-primary-foreground'
                        : 'rounded-tl-sm bg-muted',
                    )}
                  >
                    {isAgent && (
                      <span className="mb-0.5 block text-[11px] font-semibold text-green-800">
                        Luvngift team
                      </span>
                    )}
                    {msg.content}
                  </div>
                </div>
              );
            })}

            {stage === 'handed-over' && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-xs text-green-900">
                A member of the team has been alerted.{' '}
                {user
                  ? 'They will reply here, and by email if you have closed this.'
                  : `We will reply to ${contact.email || 'your email'} — you can close this window safely.`}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {confirmingClose ? (
            <div className="space-y-2 border-t p-3">
              <p className="text-xs text-muted-foreground">
                {stage === 'handed-over'
                  ? 'End this chat? The team will still reply by email.'
                  : 'End this chat, or keep it for when you come back?'}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={keepForLater}>
                  Keep for later
                </Button>
                <Button size="sm" className="flex-1" onClick={endChat}>
                  End chat
                </Button>
              </div>
            </div>
          ) : stage === 'contact' ? (
            <div className="space-y-2 border-t p-3">
              <p className="text-xs text-muted-foreground">
                Leave your name and email and a person will get back to you — this is how we reach
                you once you close this window.
              </p>
              <Input
                value={contact.name}
                onChange={(e) => setContact((c) => ({ ...c, name: e.target.value }))}
                placeholder="Your name"
                className="text-sm"
                autoComplete="name"
              />
              <Input
                type="email"
                value={contact.email}
                onChange={(e) => setContact((c) => ({ ...c, email: e.target.value }))}
                placeholder="you@example.com"
                className="text-sm"
                autoComplete="email"
              />
              {contactError && (
                <p className="flex items-start gap-1.5 text-xs text-destructive">
                  <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                  {contactError}
                </p>
              )}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setStage('chat')}
                  disabled={escalating}
                >
                  Keep chatting
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => void submitContact()}
                  disabled={escalating || !contact.name.trim() || !contact.email.trim()}
                >
                  {escalating ? <Spinner size="sm" /> : 'Send'}
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex gap-2 border-t p-3">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void handleSend();
                    }
                  }}
                  placeholder={
                    !sessionId
                      ? 'Starting chat…'
                      : stage === 'handed-over'
                        ? 'Add anything the team should know…'
                        : 'Type a message…'
                  }
                  // Still open after a handover: follow-ups are kept for the person.
                  disabled={sending || !sessionId}
                  className="text-sm"
                />
                <Button
                  size="icon"
                  onClick={() => void handleSend()}
                  disabled={sending || !input.trim() || !sessionId}
                  aria-label="Send message"
                >
                  {sending ? <Spinner size="sm" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>

              {stage === 'chat' && sessionId && (
                <button
                  onClick={() => void requestHuman()}
                  className="border-t px-3 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  Talk to a person instead
                </button>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
}
