'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useEscalatedSessions, useReplyToSession, useResolveSession } from '@/hooks/use-admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import {
  CheckCircle,
  Send,
  MessageSquare,
  User,
  Bot,
  Headphones,
  ChevronLeft,
  Mail,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Escalated conversations, built to be answerable from a phone.
 *
 * The layout is a real two-pane flow rather than two stacked cards: on a narrow
 * screen you see the list OR one conversation, never both. Stacking them meant
 * scrolling past every waiting session to reach the thread, then scrolling back
 * up to switch — unusable one-handed, which is exactly how an escalation gets
 * answered.
 *
 * The escalation email links straight here with `?session=<id>`, so a tap goes
 * from the alert to the right conversation.
 */

interface ChatSessionLike {
  id: string;
  userId: string | null;
  guestName?: string | null;
  guestEmail?: string | null;
  user?: { username?: string; email?: string } | null;
  messages?: { id: string; role: string; content: string }[];
}

/** A session belongs to a signed-in user or an anonymous visitor. */
function describe(session: ChatSessionLike): { name: string; contact: string; isGuest: boolean } {
  const isGuest = session.userId === null;
  if (isGuest) {
    return {
      name: session.guestName ?? 'Visitor',
      contact: session.guestEmail ?? 'no email given',
      isGuest: true,
    };
  }
  return {
    name: session.user?.username ?? 'Customer',
    contact: session.user?.email ?? '',
    isGuest: false,
  };
}

function AdminChat() {
  const { data: sessions, isLoading } = useEscalatedSessions();
  const reply = useReplyToSession();
  const resolve = useResolveSession();
  const searchParams = useSearchParams();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const sessionList: ChatSessionLike[] = sessions ?? [];
  const selectedSession = sessionList.find((s) => s.id === selectedId);

  // Deep link from the escalation email.
  const linkedSession = searchParams.get('session');
  useEffect(() => {
    if (linkedSession && sessionList.some((s) => s.id === linkedSession)) {
      setSelectedId(linkedSession);
    }
  }, [linkedSession, sessionList]);

  const handleReply = () => {
    if (!selectedId || !replyText.trim()) return;
    reply.mutate(
      { id: selectedId, content: replyText.trim() },
      { onSuccess: () => setReplyText('') },
    );
  };

  const handleResolve = (id: string) => {
    if (!confirm('Mark this session as resolved?')) return;
    resolve.mutate(id, {
      onSuccess: () => {
        if (selectedId === id) setSelectedId(null);
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hidden on mobile once a conversation is open — the thread needs the height. */}
      <div className={cn(selectedSession && 'hidden lg:block')}>
        <h1 className="text-2xl font-bold">Support Chat</h1>
        <p className="text-sm text-muted-foreground">
          Conversations waiting for a person. Guests have no account, so email is the only way to
          reach them.
        </p>
      </div>

      {sessionList.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <MessageSquare className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">No escalated sessions right now.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          {/* List — hidden on mobile while a conversation is open. */}
          <Card
            className={cn(
              'lg:h-[600px] lg:overflow-y-auto',
              selectedSession && 'hidden lg:block',
            )}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {sessionList.length} waiting
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-3 pt-0">
              {sessionList.map((session) => {
                const who = describe(session);
                return (
                  <button
                    key={session.id}
                    onClick={() => setSelectedId(session.id)}
                    className={cn(
                      'w-full rounded-lg border p-3 text-left transition-colors',
                      selectedId === session.id
                        ? 'border-primary bg-primary/5'
                        : 'hover:bg-muted/50',
                    )}
                  >
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium">{who.name}</span>
                      <div className="flex shrink-0 items-center gap-1">
                        {who.isGuest && (
                          <Badge variant="secondary" className="text-xs">
                            Guest
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {session.messages?.length ?? 0}
                        </Badge>
                      </div>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{who.contact}</p>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          {/* Conversation — full height on mobile, side-by-side from lg up. */}
          <Card
            className={cn(
              'flex flex-col lg:h-[600px]',
              !selectedSession && 'hidden lg:flex',
              selectedSession && 'h-[calc(100vh-10rem)]',
            )}
          >
            {selectedSession ? (
              <>
                <CardHeader className="flex-row items-center gap-2 border-b pb-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="-ml-2 shrink-0 lg:hidden"
                    onClick={() => setSelectedId(null)}
                    aria-label="Back to the list"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="truncate text-base">
                      {describe(selectedSession).name}
                    </CardTitle>
                    <p className="truncate text-xs text-muted-foreground">
                      {describe(selectedSession).contact}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={() => handleResolve(selectedSession.id)}
                    disabled={resolve.isPending}
                  >
                    <CheckCircle className="mr-1 h-3 w-3" />
                    Resolve
                  </Button>
                </CardHeader>

                {describe(selectedSession).isGuest && (
                  <div className="flex items-start gap-2 border-b bg-muted/40 px-4 py-2 text-xs text-muted-foreground">
                    <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>
                      This visitor has no account and has almost certainly closed the page — your
                      reply is emailed to them automatically.
                    </span>
                  </div>
                )}

                <CardContent className="flex-1 space-y-3 overflow-y-auto p-4">
                  {selectedSession.messages?.map((msg) => {
                    const isAgent = msg.role === 'AGENT';
                    const isBot = msg.role === 'BOT';
                    return (
                      <div
                        key={msg.id}
                        className={cn(
                          'flex max-w-[85%] gap-2',
                          isAgent ? 'ml-auto flex-row-reverse' : '',
                        )}
                      >
                        <div
                          className={cn(
                            'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                            isAgent ? 'bg-primary/10' : isBot ? 'bg-muted' : 'bg-blue-50',
                          )}
                        >
                          {isAgent ? (
                            <Headphones className="h-3.5 w-3.5 text-primary" />
                          ) : isBot ? (
                            <Bot className="h-3.5 w-3.5 text-muted-foreground" />
                          ) : (
                            <User className="h-3.5 w-3.5 text-blue-600" />
                          )}
                        </div>
                        <div
                          className={cn(
                            'whitespace-pre-wrap rounded-lg px-3 py-2 text-sm',
                            isAgent ? 'bg-primary text-primary-foreground' : 'bg-muted',
                          )}
                        >
                          {msg.content}
                        </div>
                      </div>
                    );
                  })}
                </CardContent>

                {/* Sticky on mobile so the reply box survives the on-screen keyboard. */}
                <div className="sticky bottom-0 flex gap-2 border-t bg-background p-3">
                  <Textarea
                    placeholder="Type a reply…"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    rows={2}
                    className="resize-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleReply();
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    onClick={handleReply}
                    disabled={reply.isPending || !replyText.trim()}
                    className="h-auto self-stretch px-4"
                    aria-label="Send reply"
                  >
                    {reply.isPending ? <Spinner size="sm" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </>
            ) : (
              <CardContent className="flex flex-1 items-center justify-center text-muted-foreground">
                Select a session to view the conversation.
              </CardContent>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

export default function AdminChatPage() {
  // useSearchParams needs a Suspense boundary in the App Router.
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <Spinner />
        </div>
      }
    >
      <AdminChat />
    </Suspense>
  );
}
