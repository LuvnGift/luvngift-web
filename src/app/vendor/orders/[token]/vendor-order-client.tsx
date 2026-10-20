'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import {
  Camera,
  CheckCircle2,
  Loader2,
  MapPin,
  Package,
  Phone,
  Truck,
  AlertCircle,
  ShieldAlert,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

/**
 * A vendor's single-order view, built for a phone on a Nigerian mobile network.
 *
 * Deliberate choices:
 *  - no navbar, no footer, no links out. This is a work surface for one order,
 *    not an entry point into the site.
 *  - large tap targets and one action visible at a time, because this is used
 *    standing at a doorway.
 *  - the photo is compressed in the browser before upload. A modern phone
 *    camera produces 4–8MB files, which would be slow or would fail outright
 *    against the API's 10MB cap on a weak connection.
 */

interface VendorOrder {
  reference: string;
  status: string;
  vendorName: string;
  bundleName: string;
  items: Array<{ id: string; name: string; quantity: number }>;
  recipientName: string;
  recipientPhone: string;
  deliveryStreet: string;
  deliveryCity: string;
  deliveryState: string;
  personalMessage: string | null;
  specialInstructions: string | null;
  /** For a custom gift: what the customer agreed to. This is the brief. */
  agreedBrief?: string | null;
  /** Allergies and religious requirements. A safety constraint, not a preference. */
  dietaryFlags: string[];
  dietaryNotes: string | null;
  /** Subscription cycles only; null for one-off orders. */
  substitutionPreference: SubstitutionPreference | null;
  preferredDeliveryDate: string | null;
  hasProof: boolean;
  canMarkShipped: boolean;
  canUploadProof: boolean;
}

type SubstitutionPreference = 'SMART' | 'ASK_FIRST' | 'NONE';

/**
 * The subscriber's preference (SUBSTITUTION-POLICY.md § 8), worded for the
 * vendor. Vendors never contact the customer, so "Ask me first" means: tell us,
 * and we ask.
 */
const SUBSTITUTION_GUIDANCE: Record<SubstitutionPreference, string> = {
  SMART:
    'If an item is unavailable, replace it with a similar item of the same or better quality, ' +
    'and tell Luvngift what you changed.',
  ASK_FIRST:
    'If an item is unavailable, do not replace it yet. Tell Luvngift straight away — we check ' +
    'with the customer first.',
  NONE: 'If an item is unavailable, do not replace it. Leave it out and tell Luvngift.',
};

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.8;

function errorMessage(err: unknown, fallback: string): string {
  const res = (err as { response?: { data?: { error?: { message?: string } } } })?.response;
  return res?.data?.error?.message ?? fallback;
}

/**
 * Re-encodes the photo to a bounded JPEG. Proof of delivery needs to be
 * recognisable, not archival — and an upload that fails is worth nothing.
 * Falls back to the original file if anything about canvas encoding fails.
 */
async function compress(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY),
    );
    return blob ?? file;
  } catch {
    return file;
  }
}

export function VendorOrderClient({ token }: { token: string }) {
  const [order, setOrder] = useState<VendorOrder | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [photo, setPhoto] = useState<Blob | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/api/v1/vendor-portal/orders/${token}`);
      setOrder(res.data.data);
      setLoadError(null);
    } catch (err) {
      setLoadError(
        errorMessage(err, 'We could not load this order. Check your connection and try again.'),
      );
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  // Object URLs for the preview must be revoked or they leak for the life of
  // the page, which on a low-memory phone is not academic.
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  async function markShipped() {
    setBusy(true);
    setActionError(null);
    try {
      await api.post(`/api/v1/vendor-portal/orders/${token}/shipped`);
      await load();
    } catch (err) {
      setActionError(errorMessage(err, 'Could not update the order. Please try again.'));
    } finally {
      setBusy(false);
    }
  }

  async function pickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const blob = await compress(file);
    setPhoto(blob);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(blob));
  }

  async function uploadProof() {
    if (!photo) return;
    setBusy(true);
    setActionError(null);
    try {
      const form = new FormData();
      form.append('photo', photo, 'delivery.jpg');
      if (note.trim()) form.append('note', note.trim());
      await api.post(`/api/v1/vendor-portal/orders/${token}/delivery-proof`, form, {
        // A photo on a Nigerian mobile network needs longer than the 20s default.
        timeout: 90_000,
      });
      setPhoto(null);
      setNote('');
      await load();
    } catch (err) {
      setActionError(errorMessage(err, 'The photo did not upload. Please try again.'));
    } finally {
      setBusy(false);
    }
  }

  if (loadError) {
    return (
      <Shell>
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
          <AlertCircle className="mx-auto mb-3 h-8 w-8 text-destructive" />
          <p className="font-medium">{loadError}</p>
          <Button variant="outline" className="mt-4" onClick={() => void load()}>
            Try again
          </Button>
        </div>
      </Shell>
    );
  }

  if (!order) {
    return (
      <Shell>
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Shell>
    );
  }

  const delivered = order.status === 'DELIVERED';

  return (
    <Shell>
      <header className="mb-6">
        <p className="text-sm text-muted-foreground">Hi {order.vendorName}</p>
        <h1 className="font-mono text-2xl font-bold">
          #{order.reference.slice(-8).toUpperCase()}
        </h1>
        <StatusPill status={order.status} />
      </header>

      {delivered && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-700" />
          <p className="text-sm text-green-900">
            Delivery confirmed and the photo is with us. Nothing else is needed — thank you.
          </p>
        </div>
      )}

      <Section icon={<MapPin className="h-4 w-4" />} title="Deliver to">
        <p className="text-lg font-semibold">{order.recipientName}</p>
        <p className="text-muted-foreground">
          {order.deliveryStreet}
          <br />
          {order.deliveryCity}, {order.deliveryState}
        </p>
        {/* A tel: link rather than text — the vendor is on the phone they will call from. */}
        <a
          href={`tel:${order.recipientPhone}`}
          className="mt-3 inline-flex items-center gap-2 rounded-lg bg-secondary px-4 py-3 font-medium"
        >
          <Phone className="h-4 w-4" />
          {order.recipientPhone}
        </a>
      </Section>

      <RecipientNeeds order={order} />

      <Section icon={<Package className="h-4 w-4" />} title={order.bundleName}>
        {order.items.length === 0 ? (
          <p className="text-muted-foreground">No itemised contents recorded.</p>
        ) : (
          <ul className="space-y-2">
            {order.items.map((item) => (
              <li key={item.id} className="flex justify-between gap-4">
                <span>{item.name}</span>
                <span className="shrink-0 font-medium text-muted-foreground">
                  &times;{item.quantity}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {order.agreedBrief && (
        <Section icon={<AlertCircle className="h-4 w-4" />} title="What to deliver (agreed with the customer)">
          <p className="whitespace-pre-wrap font-medium">{order.agreedBrief}</p>
        </Section>
      )}

      {order.specialInstructions && (
        <Section
          icon={<AlertCircle className="h-4 w-4" />}
          title={order.agreedBrief ? 'Original request (the agreed brief above takes priority)' : 'Special instructions'}
        >
          <p className="whitespace-pre-wrap">{order.specialInstructions}</p>
        </Section>
      )}

      {order.personalMessage && (
        <Section icon={<Package className="h-4 w-4" />} title="Message to include">
          <p className="whitespace-pre-wrap italic">&ldquo;{order.personalMessage}&rdquo;</p>
        </Section>
      )}

      {actionError && (
        <p className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {actionError}
        </p>
      )}

      {order.canMarkShipped && (
        <Button
          size="lg"
          className="mb-4 h-14 w-full text-base"
          disabled={busy}
          onClick={() => void markShipped()}
        >
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Truck className="h-5 w-5" />}
          <span className="ml-2">Mark as on its way</span>
        </Button>
      )}

      {order.canUploadProof && (
        <Section icon={<Camera className="h-4 w-4" />} title="Photo at handover">
          <p className="mb-4 text-sm text-muted-foreground">
            The buyer is abroad and never sees the delivery. This photo is what they get instead,
            so it is the most important part of the job.
          </p>
          {/* Vendor Agreement § 9: the photo goes to the buyer and is stored by
              us, so it must not capture people who have not agreed to it. */}
          <p className="mb-4 text-sm text-muted-foreground">
            Photograph the gift at the delivery address. Do not include the recipient or other
            people, especially children, unless the recipient clearly agrees.
          </p>

          {preview && (
            <div className="relative mb-4 h-56 w-full overflow-hidden rounded-lg bg-muted">
              {/* `unoptimized`: the src is a local blob: URL, which the Next.js
                  image optimizer cannot fetch. */}
              <Image
                src={preview}
                alt="Delivery photo preview"
                fill
                unoptimized
                className="object-cover"
              />
            </div>
          )}

          {/* `capture` opens the camera directly instead of the file browser. */}
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => void pickPhoto(e)}
          />

          <Button
            variant="outline"
            size="lg"
            className="h-14 w-full text-base"
            disabled={busy}
            onClick={() => fileInput.current?.click()}
          >
            <Camera className="h-5 w-5" />
            <span className="ml-2">{photo ? 'Take a different photo' : 'Take photo'}</span>
          </Button>

          {photo && (
            <>
              <Textarea
                className="mt-4"
                rows={3}
                maxLength={500}
                placeholder="Anything to add? For example: handed to Ada's sister at the gate."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <Button
                size="lg"
                className="mt-4 h-14 w-full text-base"
                disabled={busy}
                onClick={() => void uploadProof()}
              >
                {busy ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-5 w-5" />
                )}
                <span className="ml-2">Confirm delivery</span>
              </Button>
            </>
          )}
        </Section>
      )}
    </Shell>
  );
}

/**
 * Shown above the contents, because it governs what may go in the box. Dietary
 * flags override the substitution preference: no replacement may cross them.
 */
function RecipientNeeds({ order }: { order: VendorOrder }) {
  const hasDietary = order.dietaryFlags.length > 0 || Boolean(order.dietaryNotes);
  if (!hasDietary && !order.substitutionPreference) return null;

  return (
    <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950">
      {hasDietary && (
        <div className="flex gap-3">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">Dietary needs: nothing in the box may contain these</p>
            {order.dietaryFlags.length > 0 && (
              <p className="mt-1 text-base font-medium">{order.dietaryFlags.join(', ')}</p>
            )}
            {order.dietaryNotes && (
              <p className="mt-1 whitespace-pre-wrap text-sm">{order.dietaryNotes}</p>
            )}
            <p className="mt-2 text-sm">Check every replacement against this list too.</p>
          </div>
        </div>
      )}
      {order.substitutionPreference && (
        <p className={hasDietary ? 'mt-3 border-t border-amber-200 pt-3 text-sm' : 'text-sm'}>
          <span className="font-semibold">Missing items: </span>
          {SUBSTITUTION_GUIDANCE[order.substitutionPreference]}
        </p>
      )}
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main id="main-content" className="mx-auto min-h-screen w-full max-w-lg px-4 py-8">
      {children}
      <p className="mt-10 text-center text-xs text-muted-foreground">
        Luvngift · this page is private to you and to this order
      </p>
    </main>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-4 rounded-xl border bg-card p-5">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );
}

const STATUS_STYLES: Record<string, string> = {
  PROCESSING: 'bg-amber-100 text-amber-900',
  SHIPPED: 'bg-blue-100 text-blue-900',
  DELIVERED: 'bg-green-100 text-green-900',
  CANCELLED: 'bg-muted text-muted-foreground',
  REFUNDED: 'bg-muted text-muted-foreground',
  PENDING: 'bg-muted text-muted-foreground',
};

const STATUS_LABELS: Record<string, string> = {
  PROCESSING: 'Needs to be prepared',
  SHIPPED: 'On its way',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled — do not deliver',
  REFUNDED: 'Refunded — do not deliver',
  PENDING: 'Not ready yet',
};

function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={`mt-2 inline-block rounded-full px-3 py-1 text-sm font-semibold ${
        STATUS_STYLES[status] ?? 'bg-muted text-muted-foreground'
      }`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
