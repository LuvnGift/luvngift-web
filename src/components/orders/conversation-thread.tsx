import {
  buildTimeline,
  formatMoney,
  type OrderConversation,
  type TimelineEntry,
} from '@/lib/custom-orders';

type Viewer = 'CUSTOMER' | 'ADMIN';

/**
 * Messages and quote events for a custom gift request, oldest first. Shared by
 * the customer's order page and the admin order panel; `viewer` only changes
 * whose bubbles sit on the right and how each side is named.
 */
export function ConversationThread({
  conversation,
  viewer,
}: {
  conversation: OrderConversation;
  viewer: Viewer;
}) {
  const entries = buildTimeline(conversation);
  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {viewer === 'CUSTOMER'
          ? 'No messages yet. Anything we should know? Write to us below.'
          : 'No messages yet. Ask the customer anything you need before quoting.'}
      </p>
    );
  }
  return (
    <ol className="space-y-3">
      {entries.map((entry) => (
        <li key={`${entry.kind}-${entryId(entry)}`}>
          <ThreadItem entry={entry} viewer={viewer} />
        </li>
      ))}
    </ol>
  );
}

const entryId = (entry: TimelineEntry): string =>
  entry.kind === 'message' ? entry.message.id : entry.quote.id;

const RESPONSE_VERB: Record<string, string> = {
  ACCEPTED: 'accepted',
  CHANGES_REQUESTED: 'asked for changes to',
  DECLINED: 'declined',
};

function names(viewer: Viewer) {
  return viewer === 'CUSTOMER'
    ? { customer: 'You', us: 'Luvngift' }
    : { customer: 'Customer', us: 'Luvngift' };
}

function ThreadItem({ entry, viewer }: { entry: TimelineEntry; viewer: Viewer }) {
  const when = new Date(entry.at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  const who = names(viewer);
  if (entry.kind === 'message') {
    const mine = entry.message.author === viewer;
    return (
      <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
        <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${mine ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
          <p className="whitespace-pre-wrap break-words">{entry.message.body}</p>
          <p className={`mt-1 text-[11px] ${mine ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
            {entry.message.author === 'CUSTOMER' ? who.customer : who.us} · {when}
          </p>
        </div>
      </div>
    );
  }
  const { quote } = entry;
  const amount = formatMoney(quote.total, quote.currency);
  const text =
    entry.kind === 'quote'
      ? `${who.us} sent ${quote.round > 1 ? 'a revised' : 'a'}${quote.isFinal ? ' final' : ''} quote: ${amount}`
      : `${who.customer} ${RESPONSE_VERB[quote.response] ?? 'answered'} the ${amount} quote`;
  return (
    <div className="text-center text-xs text-muted-foreground">
      <p>{text} · {when}</p>
      {entry.kind === 'response' && quote.customerComment && (
        <p className="mt-1 italic">&ldquo;{quote.customerComment}&rdquo;</p>
      )}
    </div>
  );
}
