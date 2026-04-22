import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { Occasion } from '@luvngift/shared';

interface OccasionCardProps {
  occasion: Occasion;
}

export function OccasionCard({ occasion }: OccasionCardProps) {
  return (
    <Link href={`/occasions/${occasion.slug}`} className="group block">
      <Card className="overflow-hidden transition-shadow hover:shadow-md">
        <div className="relative aspect-[4/3] bg-muted">
          {occasion.image ? (
            <Image
              src={occasion.image}
              alt={occasion.name}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-4xl select-none">
              🎁
            </div>
          )}
        </div>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-base">{occasion.name}</h3>
              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{occasion.description}</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 ml-3 transition-transform group-hover:translate-x-1" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
