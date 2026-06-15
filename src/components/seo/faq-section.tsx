import { ChevronDown } from 'lucide-react';
import type { FAQ } from '@/content/faqs';

interface FaqSectionProps {
  faqs: FAQ[];
  title?: string;
  /**
   * Emit FAQPage structured data. Keep this true on exactly one FAQ block per
   * page — Google expects a single FAQPage per URL.
   */
  includeJsonLd?: boolean;
  className?: string;
}

/**
 * Server-rendered FAQ list. Uses native <details>/<summary> so the questions and
 * answers are present in the initial HTML (good for crawlers and accessible with
 * zero client JavaScript). Optionally emits FAQPage JSON-LD for rich results.
 */
export function FaqSection({
  faqs,
  title = 'Frequently asked questions',
  includeJsonLd = true,
  className = '',
}: FaqSectionProps) {
  if (!faqs.length) return null;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  };

  return (
    <section className={className} aria-labelledby="faq-heading">
      {includeJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <h2 id="faq-heading" className="text-2xl font-bold mb-6">
        {title}
      </h2>
      <div className="divide-y rounded-lg border">
        {faqs.map((f) => (
          <details key={f.question} className="group px-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-medium [&::-webkit-details-marker]:hidden">
              <span>{f.question}</span>
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>
            <p className="pb-4 text-sm leading-relaxed text-muted-foreground">{f.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
