'use client';

import { CreditCard, Star, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import {
  useSavedCards,
  useDeleteSavedCard,
  useSetDefaultCard,
  type SavedCard,
} from '@/hooks/use-checkout';

function brandLabel(brand: string) {
  if (brand === 'amex') return 'Amex';
  return brand.charAt(0).toUpperCase() + brand.slice(1);
}

/** Cards expire on the last day of their expiry month. */
function isExpired(card: SavedCard) {
  const now = new Date();
  return card.expYear < now.getFullYear()
    || (card.expYear === now.getFullYear() && card.expMonth < now.getMonth() + 1);
}

export function SavedCardsCard() {
  const { data: cards, isLoading } = useSavedCards();
  const deleteCard = useDeleteSavedCard();
  const setDefault = useSetDefaultCard();

  const handleDelete = (card: SavedCard) => {
    if (!confirm(`Remove your ${brandLabel(card.brand)} ending in ${card.last4}?`)) return;
    deleteCard.mutate(card.id);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-muted-foreground" />
          <CardTitle>Payment methods</CardTitle>
        </div>
        <CardDescription>
          Cards you&apos;ve saved for faster checkout. Stored securely by Stripe — we never see
          your full card number.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-6"><Spinner /></div>
        ) : !cards || cards.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">
            No saved cards yet. Tick &ldquo;Save this card for future gifts&rdquo; at checkout to
            add one.
          </p>
        ) : (
          <ul className="space-y-2">
            {cards.map((card) => {
              const expired = isExpired(card);
              return (
                <li
                  key={card.id}
                  className="flex items-center justify-between gap-3 rounded-md border p-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-sm flex items-center gap-2 flex-wrap">
                      {brandLabel(card.brand)} •••• {card.last4}
                      {card.isDefault && (
                        <span className="rounded-full bg-green-100 text-green-800 px-2 py-0.5 text-xs font-semibold">
                          Default
                        </span>
                      )}
                      {expired && (
                        <span className="rounded-full bg-red-100 text-red-800 px-2 py-0.5 text-xs font-semibold">
                          Expired
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Expires {String(card.expMonth).padStart(2, '0')}/{card.expYear}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {!card.isDefault && !expired && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDefault.mutate(card.id)}
                        disabled={setDefault.isPending}
                        title="Make default"
                      >
                        <Star className="h-3.5 w-3.5 mr-1" />
                        Default
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground hover:text-red-600"
                      onClick={() => handleDelete(card)}
                      disabled={deleteCard.isPending}
                      title="Remove card"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
