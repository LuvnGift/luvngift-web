'use client';

import { useState } from 'react';
import { Send, Tag } from 'lucide-react';
import {
  useAdminOrderConversation,
  useAdminSendOrderMessage,
  useSendQuote,
} from '@/hooks/use-admin';
import { useOrderLive } from '@/hooks/use-order-live';
import { ConversationThread } from '@/components/orders/conversation-thread';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { fieldErrors, quoteFormSchema, toMinorUnits } from '@/lib/admin-schemas';
import {
  ADMIN_STAGE,
  MESSAGE_MAX,
  formatMoney,
  type CustomOrderQuote,
  type OrderConversation,
  type QuoteStatus,
} from '@/lib/custom-orders';

/**
 * Ops' side of a custom gift request: clarify with the customer, then quote.
 *
 *   needs quote → (messages) → quote → accepted → paid → assign vendor
 *                                    → changes requested → revised quote ↗
 *
 * Vendor assignment is refused by the API until the quote is accepted AND paid;
 * `customOrderVendorBlock` below explains why when it is.
 */

interface Props {
  order: {
    id: string;
    status: string;
    currency: string;
    quoteStatus: QuoteStatus;
  };
}

const QUOTABLE: QuoteStatus[] = ['AWAITING_QUOTE', 'QUOTED', 'CHANGES_REQUESTED'];

export function CustomOrderSection({ order }: Props) {
  const { data: conversation, isLoading } = useAdminOrderConversation(order.id);
  useOrderLive(order.id, [['admin', 'orders']]);

  if (isLoading || !conversation) {
    return <div className="flex justify-center py-6"><Spinner /></div>;
  }

  const stage = ADMIN_STAGE[conversation.quoteStatus];
  const canQuote = order.status === 'PENDING' && QUOTABLE.includes(conversation.quoteStatus);
  const closed = order.status === 'CANCELLED' || order.status === 'REFUNDED';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
          Custom request — conversation
        </p>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${stage.className}`}>
          {stage.label}
        </span>
      </div>

      <div className="max-h-80 overflow-y-auto rounded-md border p-3">
        <ConversationThread conversation={conversation} viewer="ADMIN" />
      </div>

      {!closed && <AdminComposer orderId={order.id} />}
      {canQuote && <QuoteForm order={order} conversation={conversation} />}
    </div>
  );
}

/**
 * Why a custom order cannot go to a vendor yet, or null if it can. Mirrors the
 * API's `assertCustomOrderReadyForVendor` so the button explains itself instead
 * of failing on click.
 */
export function customOrderVendorBlock(order: {
  quoteStatus?: QuoteStatus | null;
  payment?: { status: string } | null;
}): string | null {
  if (!order.quoteStatus) return null;
  if (order.quoteStatus !== 'ACCEPTED') return 'Waiting for the customer to accept a quote';
  if (order.payment?.status !== 'SUCCEEDED') return 'Quote accepted — waiting for payment';
  return null;
}

function AdminComposer({ orderId }: { orderId: string }) {
  const send = useAdminSendOrderMessage(orderId);
  const [body, setBody] = useState('');

  return (
    <div className="space-y-2">
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={MESSAGE_MAX}
        rows={2}
        placeholder="Ask the customer a question — they are emailed and can reply on their order page."
      />
      <div className="flex justify-end">
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          disabled={send.isPending || !body.trim()}
          onClick={() => send.mutate(body.trim(), { onSuccess: () => setBody('') })}
        >
          <Send className="h-3.5 w-3.5" /> Send message
        </Button>
      </div>
    </div>
  );
}

function initialValues(conversation: OrderConversation) {
  const last: CustomOrderQuote | undefined = conversation.quotes[conversation.quotes.length - 1];
  return {
    priceMajor: last ? (last.subtotal / 100).toFixed(2) : '',
    scope: last?.scope ?? '',
    note: '',
    // A revision after the customer pushed back is usually the last offer.
    isFinal: conversation.quoteStatus === 'CHANGES_REQUESTED',
  };
}

function QuoteForm({
  order,
  conversation,
}: {
  order: Props['order'];
  conversation: OrderConversation;
}) {
  const sendQuote = useSendQuote(order.id);
  const [values, setValues] = useState(() => initialValues(conversation));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (patch: Partial<typeof values>) => setValues((v) => ({ ...v, ...patch }));

  const replacing = conversation.quoteStatus === 'QUOTED';
  const submit = () => {
    const parsed = quoteFormSchema.safeParse(values);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    sendQuote.mutate({
      subtotal: toMinorUnits(parsed.data.priceMajor),
      scope: parsed.data.scope,
      note: parsed.data.note || undefined,
      isFinal: parsed.data.isFinal,
    });
  };

  return (
    <div className="space-y-3 rounded-md border border-purple-200 bg-purple-50/50 p-3">
      <p className="text-sm font-medium flex items-center gap-1.5">
        <Tag className="h-4 w-4" />
        {replacing ? 'Replace the quote the customer has not answered yet' : conversation.quotes.length ? 'Send a revised quote' : 'Send a quote'}
      </p>
      <div className="space-y-1.5">
        <Label>Price ({order.currency})</Label>
        <Input
          inputMode="decimal"
          value={values.priceMajor}
          onChange={(e) => set({ priceMajor: e.target.value })}
          placeholder="0.00"
        />
        {errors.priceMajor && <p className="text-xs text-destructive">{errors.priceMajor}</p>}
      </div>
      <div className="space-y-1.5">
        <Label>What will be delivered</Label>
        <Textarea
          rows={4}
          value={values.scope}
          onChange={(e) => set({ scope: e.target.value })}
          placeholder="Exactly what the customer is agreeing to. Once accepted, this is the vendor's brief."
        />
        {errors.scope && <p className="text-xs text-destructive">{errors.scope}</p>}
      </div>
      <div className="space-y-1.5">
        <Label>Note to customer <span className="text-muted-foreground">(optional)</span></Label>
        <Textarea
          rows={2}
          value={values.note}
          onChange={(e) => set({ note: e.target.value })}
          placeholder="Assumptions, timing, anything they should know."
        />
      </div>
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          className="mt-0.5"
          checked={values.isFinal}
          onChange={(e) => set({ isFinal: e.target.checked })}
        />
        <span>
          Final quote
          <span className="block text-xs text-muted-foreground">
            The customer can accept or decline it, but not ask for further changes.
          </span>
        </span>
      </label>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {values.priceMajor && !errors.priceMajor && Number(values.priceMajor) > 0
            ? `Customer will see ${formatMoney(toMinorUnits(values.priceMajor), order.currency)}`
            : 'Tax is not added to custom quotes.'}
        </p>
        <Button size="sm" onClick={submit} disabled={sendQuote.isPending}>
          {sendQuote.isPending ? 'Sending…' : 'Send quote'}
        </Button>
      </div>
    </div>
  );
}
