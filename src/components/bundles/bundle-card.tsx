'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Clock } from 'lucide-react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useUserCurrency } from '@/hooks/use-exchange-rates';
import { formatCurrency } from '@luvngift/shared';
import type { Bundle } from '@luvngift/shared';

interface BundleCardProps {
  bundle: Bundle;
}

export function BundleCard({ bundle }: BundleCardProps) {
  const { currency, convert, ready } = useUserCurrency();
  const displayPrice = ready ? formatCurrency(convert(bundle.price), currency as any) : null;

  return (
    <Card className="flex flex-col overflow-hidden hover:shadow-md transition-shadow">
      <div className="relative aspect-video bg-muted">
        {bundle.images?.[0] ? (
          <Image
            src={bundle.images[0]}
            alt={bundle.name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-3xl select-none">🎁</div>
        )}
      </div>

      <CardContent className="flex-1 p-4 space-y-2">
        <h3 className="font-semibold text-base leading-tight">{bundle.name}</h3>
        <p className="text-sm text-muted-foreground line-clamp-2">{bundle.description}</p>

        <div className="flex flex-wrap gap-1 pt-1">
          {bundle.items?.slice(0, 3).map((item) => (
            <Badge key={item.id} variant="secondary" className="text-xs">
              {item.name}
            </Badge>
          ))}
          {(bundle.items?.length ?? 0) > 3 && (
            <Badge variant="outline" className="text-xs">+{bundle.items.length - 3} more</Badge>
          )}
        </div>

        <div className="flex items-center gap-1 text-xs text-muted-foreground pt-1">
          <Clock className="h-3 w-3" />
          <span>Est. {bundle.estimatedDeliveryDays} days delivery</span>
        </div>
      </CardContent>

      <CardFooter className="flex items-center justify-between p-4 pt-0">
        <span className="text-lg font-bold">
          {displayPrice ?? <span className="inline-block h-5 w-16 animate-pulse rounded bg-muted" />}
        </span>
        <Button size="sm" asChild>
          <Link href={`/bundles/${bundle.slug}`}>View bundle</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
