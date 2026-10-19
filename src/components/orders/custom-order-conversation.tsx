'use client';

import { useState } from 'react';
import { Check, CreditCard, PencilLine, Send, X } from 'lucide-react';
import { useOrderConversation, useRespondToQuote, useSendOrderMessage } from '@/hooks/use-orders';
import { PayOrderDialog, type PayableOrder } from '@/components/orders/pay-order-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ConversationThread } from '@/components/orders/conversation-thread';
import { Spinner } from '@/components/ui/spinner';
import {
  CUSTOMER_STAGE,
  MESSAGE_MAX,
  acceptedQuote,
  formatMoney,
  openQuote,
  orderMessageSchema,
  requestChangesSchema,
  type CustomOrderQuote,
  type OrderConversation,
} from '@/lib/custom-orders';

interface Props {
  order: PayableOrder & { status: string; payment?: { status: string } | null };
  onPaid: () => void;
}

/**
 * The customer's side of a custom gift request: read and answer quotes, ask and
 * answer questions, and pay once a price is agreed.
 */
export function CustomOrderConversation({ order, onPaid }: Props) {
  const { data: conversation, isLoading } = useOrderConversation(order.id);
  const [paying, setPaying] = useState(false);

  if (isLoading || !conversation) {
    return <Card><CardContent className="flex justify-center py-10"><Spinner /></CardContent></Card>;
  }

  const quote = openQuote(conversation);
  const awaitingPayment =
    conversation.quoteStatus === 'ACCEPTED' &&
    order.status === 'PENDING' &&
    order.payment?.status !== 'SUCCEEDED';
  const closed = order.status === 'CANCELLED' || order.status === 'REFUNDED';

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-base">Your custom gift request</CardTitle>
        <p className="text-sm text-muted-foreground">{stageHint(conversation, awaitingPayment)}</p>
      </CardHeader>
      <CardContent className="space-y-5">
        {quote && <OpenQuote orderId={order.id} quote={quote} onAccepted={() => setPaying(true)} />}
        {awaitingPayment && <PayPrompt conversation={conversation} onPay={() => setPaying(true)} />}
        <ConversationThread conversation={conversation} viewer="CUSTOMER" />
        {!closed && <Composer orderId={order.id} />}
      </CardContent>
      <PayOrderDialog
        order={paying ? order : null}
        onClose={() => setPaying(false)}
        onPaid={() => { setPaying(false); onPaid(); }}
      />
    </Card>
  );
}

function stageHint(conversation: OrderConversation, awaitingPayment: boolean): string {
  if (awaitingPayment) return 'You accepted our quote. Pay to confirm and we will start sourcing your gift.';
  switch (conversation.quoteStatus) {
    case 'AWAITING_QUOTE':
      return 'We are reviewing your request and will send a price soon. We may message you here with questions.';
    case 'CHANGES_REQUESTED':
      return 'Thanks — we are revising the quote based on your feedback.';
    case 'DECLINED':
      return 'You declined this quote, so the request was cancelled. Nothing was charged.';
    default:
      return CUSTOMER_STAGE[conversation.quoteStatus];
  }
}

// ─── The quote waiting for an answer ─────────────────────────────────────────

function OpenQuote({
  orderId,
  quote,
  onAccepted,
}: {
  orderId: string;
  quote: CustomOrderQuote;
  onAccepted: () => void;
}) {
  const respond = useRespondToQuote(orderId);
  const [mode, setMode] = useState<'idle' | 'changes' | 'decline'>('idle');

  const accept = () =>
    respond.mutate({ round: quote.round, action: 'ACCEPT' }, { onSuccess: onAccepted });

  return (
    <div className="rounded-lg border-2 border-primary/30 bg-primary/5 p-4 space-y-3">
      <QuoteSummary quote={quote} />
      {mode === 'idle' && (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button onClick={accept} disabled={respond.isPending} className="gap-1.5 sm:flex-1">
            <Check className="h-4 w-4" /> Accept and pay
          </Button>
          {!quote.isFinal && (
            <Button variant="outline" onClick={() => setMode('changes')} className="gap-1.5 sm:flex-1">
              <PencilLine className="h-4 w-4" /> Request changes
            </Button>
          )}
          <Button variant="ghost" onClick={() => setMode('decline')} className="gap-1.5 text-muted-foreground">
            <X className="h-4 w-4" /> Decline
          </Button>
        </div>
      )}
      {mode !== 'idle' && (
        <RespondForm
          kind={mode}
          busy={respond.isPending}
          onCancel={() => setMode('idle')}
          onSubmit={(comment) =>
            respond.mutate(
              { round: quote.round, action: mode === 'changes' ? 'REQUEST_CHANGES' : 'DECLINE', comment },
              { onSuccess: () => setMode('idle') },
            )
          }
        />
      )}
    </div>
  );
}

function QuoteSummary({ quote }: { quote: CustomOrderQuote }) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-medium">
          {quote.round > 1 ? 'Revised quote' : 'Your quote'}
          {quote.isFinal && <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-xs">Final</span>}
        </p>
        <p className="text-lg font-semibold">{formatMoney(quote.total, quote.currency)}</p>
      </div>
      {quote.tax > 0 && (
        <p className="text-xs text-muted-foreground">
          {formatMoney(quote.subtotal, quote.currency)} + {formatMoney(quote.tax, quote.currency)} tax
        </p>
      )}
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">What we will deliver</p>
        <p className="text-sm whitespace-pre-wrap">{quote.scope}</p>
      </div>
      {quote.note && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{quote.note}</p>}
      {quote.isFinal && (
        <p className="text-xs text-muted-foreground">
          This is our final price for this request. You can accept it or decline it.
        </p>
      )}
    </div>
  );
}

function RespondForm({
  kind,
  busy,
  onCancel,
  onSubmit,
}: {
  kind: 'changes' | 'decline';
  busy: boolean;
  onCancel: () => void;
  onSubmit: (comment?: string) => void;
}) {
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    if (kind === 'changes') {
      const parsed = requestChangesSchema.safeParse({ comment });
      if (!parsed.success) return setError(parsed.error.issues[0].message);
    }
    setError(null);
    onSubmit(comment.trim() || undefined);
  };

  return (
    <div className="space-y-2">
      <Textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        maxLength={MESSAGE_MAX}
        rows={3}
        placeholder={
          kind === 'changes'
            ? 'What would you like changed? e.g. swap the wine for juice, keep it under a budget…'
            : 'Optional: tell us why, so we can do better next time.'
        }
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onCancel} disabled={busy}>Back</Button>
        <Button
          size="sm"
          variant={kind === 'decline' ? 'destructive' : 'default'}
          onClick={submit}
          disabled={busy}
        >
          {kind === 'changes' ? 'Send request' : 'Decline and cancel request'}
        </Button>
      </div>
    </div>
  );
}

function PayPrompt({ conversation, onPay }: { conversation: OrderConversation; onPay: () => void }) {
  const quote = acceptedQuote(conversation);
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-3">
      {quote && <QuoteSummary quote={quote} />}
      <Button onClick={onPay} className="w-full gap-1.5">
        <CreditCard className="h-4 w-4" /> Pay {quote ? formatMoney(quote.total, quote.currency) : 'now'}
      </Button>
    </div>
  );
}

// ─── Conversation ────────────────────────────────────────────────────────────

function Composer({ orderId }: { orderId: string }) {
  const send = useSendOrderMessage(orderId);
  const [body, setBody] = useState('');

  const submit = () => {
    if (!orderMessageSchema.safeParse({ body }).success) return;
    send.mutate(body.trim(), { onSuccess: () => setBody('') });
  };

  return (
    <div className="space-y-2 border-t pt-4">
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={MESSAGE_MAX}
        rows={2}
        placeholder="Ask a question or add detail about your gift…"
      />
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">We will email you when we reply.</p>
        <Button size="sm" onClick={submit} disabled={send.isPending || !body.trim()} className="gap-1.5">
          <Send className="h-3.5 w-3.5" /> Send
        </Button>
      </div>
    </div>
  );
}
