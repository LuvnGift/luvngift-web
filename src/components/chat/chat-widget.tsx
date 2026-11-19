'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, Bot, User, Headset, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { useAuthStore } from '@/store/auth.store';
import { useIsAdmin } from '@/hooks/use-is-admin';
import {
  useSendChatMessage,
  useStartChat,
  useChatSocket,
  useResumeChat,
  useEscalateChat,
  type ResumedChat,
} from '@/hooks/use-chat';
import { ChatMessageRole } from '@luvngift/shared';
import type { ChatMessage } from '@luvngift/shared';
import { cn } from '@/lib/utils';
import { clearGuestChat, clearUserChat, writeUserChat } from '@/lib/guest-chat';

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

/** The panel is open and the tab is in front: the only time a reply counts as seen. */
function isConversationInView(isOpen: boolean): boolean {
  return isOpen && typeof document !== 'undefined' && document.visibilityState === 'visible';
}

/**
 * Admin accounts answer chats from /admin/chat; one started from the widget
 * would land in their own support queue (and the API refuses it).
 */
export function ChatWidget() {
  const isAdmin = useIsAdmin();
  return isAdmin ? null : <ChatWidgetPanel />;
}

function ChatWidgetPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [guestKey, setGuestKey] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [stage, setStage] = useState<Stage>('chat');
  const [contact, setContact] = useState({ name: '', email: '' });
  const [contactError, setContactError] = useState<string | null>(null);
  const [confirmingClose, setConfirmingClose] = useState(false);
  /** Agent replies that arrived while the panel was closed or the tab hidden. */
  const [unread, setUnread] = useState(0);
  const isOpenRef = useRef(false);
  /** The page-load resume, so opening the panel mid-flight does not start a second chat. */
  const resumeRef = useRef<Promise<ResumedChat | null> | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { user } = useAuthStore();
  const { mutateAsync: startChat, isPending: starting } = useStartChat();
  const { mutateAsync: sendMessage, isPending: sending } = useSendChatMessage();
  const { mutateAsync: resumeChat } = useResumeChat();
  const userId = user?.id ?? null;
  const { mutateAsync: escalate, isPending: escalating } = useEscalateChat();

  const handleIncomingMessage = useCallback((msg: ChatMessage) => {
    setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
    if (msg.role === ChatMessageRole.AGENT && !isConversationInView(isOpenRef.current)) {
      setUnread((n) => n + 1);
    }
  }, []);

  const { markSeen, joined } = useChatSocket(sessionId, handleIncomingMessage, guestKey);

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  /**
   * Reports the agent's replies as seen, which is what stops them being
   * emailed. Only while the panel is open AND the tab is visible: a reply
   * sitting in a background tab has not been read.
   */
  useEffect(() => {
    if (!joined) return;
    const report = () => {
      if (!isConversationInView(isOpenRef.current)) return;
      setUnread(0);
      if (messages.some((m) => m.role === ChatMessageRole.AGENT)) markSeen();
    };
    report();
    document.addEventListener('visibilitychange', report);
    return () => document.removeEventListener('visibilitychange', report);
  }, [joined, isOpen, messages, markSeen]);

  const applyResumed = useCallback((resumed: ResumedChat) => {
    setSessionId(resumed.session.sessionId);
    setGuestKey(resumed.session.guestKey);
    setMessages(resumed.messages);
    setUnread(resumed.unread);
    setStage(resumed.isEscalated ? 'handed-over' : 'chat');
  }, []);

  /**
   * Picks the stored conversation back up on page load, not on first open, so
   * the socket is in the room and an agent's reply arrives live (with a dot on
   * the closed bubble) instead of waiting for the email fallback.
   */
  useEffect(() => {
    if (sessionId) return;
    const pending = resumeChat({ userId });
    resumeRef.current = pending;
    void pending.then((resumed) => {
      if (resumed && resumeRef.current === pending) applyResumed(resumed);
    });
    // Re-run only when who is signed in changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, stage]);

  const greeting = user
    ? `Hi ${user.username}! Ask me anything about our gifts, delivery to Nigeria, or how subscriptions work.`
    : 'Hi! Ask me anything about our gifts, delivery to Nigeria, or how it all works. I can get a person for you at any point.';

  const begin = useCallback(async () => {
    // A returning visitor keeps their open thread, signed in or not.
    const resumed = await (resumeRef.current ?? resumeChat({ userId }));
    if (resumed) {
      applyResumed(resumed);
      return;
    }
    try {
      const started = await startChat();
      if (userId) writeUserChat(userId, started.sessionId);
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
  }, [userId, resumeChat, applyResumed, startChat, greeting]);

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

  // The unseen-reply email links to `/?chat=open`. Read once, then dropped from
  // the address bar so a reload does not pop the panel open again.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get('chat') !== 'open') return;
    url.searchParams.delete('chat');
    window.history.replaceState(window.history.state, '', url.toString());
    void openChat();
    // Mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    clearUserChat();
    resumeRef.current = null;
    setUnread(0);
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
          className="fixed bottom-6 right-6 z-50 print:hidden flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-colors hover:bg-primary/90"
          aria-label={unread > 0 ? `Chat with us, ${unread} new from the team` : 'Chat with us'}
        >
          <MessageCircle className="h-6 w-6" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-green-600 px-1 text-[11px] font-semibold text-white ring-2 ring-background">
              {unread}
            </span>
          )}
        </button>
      )}

      {isOpen && (
        <div className="fixed bottom-6 right-6 left-6 z-50 print:hidden flex flex-col rounded-xl border bg-background shadow-2xl sm:left-auto sm:w-96">
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
              className="text-primary-foreground transition-opacity hover:opacity-80"
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
                  ? 'They will reply here. If you have left by then, we will email you the reply.'
                  : `They will reply here. If you have left by then, we will email ${contact.email || 'you'} — you can close this window safely.`}
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
