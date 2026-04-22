import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { Separator } from '@/components/ui/separator';
import { Gift, Heart, Globe, ShieldCheck } from 'lucide-react';

export const metadata = {
  title: 'About Us — Luvngift',
  description: 'Learn how Luvngift helps the Nigerian diaspora send meaningful gifts home.',
};

const values = [
  {
    icon: Heart,
    title: 'Connection over distance',
    body: 'Distance should never get in the way of celebrating the people you love. We make it effortless to show up for every birthday, holiday, and milestone — no matter where you are.',
  },
  {
    icon: Globe,
    title: 'Built for the diaspora',
    body: 'We understand the unique experience of Nigerians living in Canada, the US, and the UK. Every part of our platform is designed around your real needs — pay in your currency, we handle the rest in Nigeria.',
  },
  {
    icon: ShieldCheck,
    title: 'Trust & transparency',
    body: 'Every order is tracked in real time. You always know where your gift is, and your payment is secured by Stripe. No surprises, no hidden fees.',
  },
  {
    icon: Gift,
    title: 'Curated with care',
    body: 'Our Nigeria-based team handpicks every item in every bundle. We know what recipients love because we are part of the same community.',
  },
];

export default function AboutPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-gradient-to-br from-primary/5 via-background to-secondary/30 py-24">
          <div className="container mx-auto px-4 text-center max-w-3xl">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 mb-6 mx-auto">
              <Gift className="h-7 w-7 text-primary" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
              We exist to close the gap
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Luvngift was born out of a simple frustration — sending a meaningful gift to loved ones in Nigeria from abroad was too complicated, too unreliable, and felt impersonal. We set out to change that.
            </p>
          </div>
        </section>

        <Separator />

        {/* Story */}
        <section className="py-20 bg-background">
          <div className="container mx-auto px-4 max-w-2xl text-center">
            <h2 className="text-3xl font-bold mb-6">Our story</h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed text-base">
              <p>
                Like many diaspora families, our founders spent years scrambling to send gifts home for birthdays, Eid, Christmas, and graduations — only to deal with unreliable couriers, currency confusion, and gifts that arrived late or not at all.
              </p>
              <p>
                In 2024 we decided to build the platform we always wished existed. Luvngift brings together a curated catalogue of gift bundles, a Nigeria-based fulfilment team, and a seamless payment experience — all in one place.
              </p>
              <p>
                Today we serve diaspora Nigerians across Canada, the United States, and the United Kingdom, delivering joy to recipients in Lagos, Abuja, Port Harcourt, and every corner of Nigeria.
              </p>
            </div>
          </div>
        </section>

        <Separator />

        {/* Values */}
        <section className="py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">What we stand for</h2>
            <div className="grid sm:grid-cols-2 gap-8 max-w-3xl mx-auto">
              {values.map((v) => (
                <div key={v.title} className="flex gap-4">
                  <div className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                    <v.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{v.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{v.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <Separator />

        {/* CTA */}
        <section className="py-20 bg-background text-center">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl font-bold mb-3">Ready to send something special?</h2>
            <p className="text-muted-foreground mb-6">Browse our occasions and find the perfect bundle for your loved one.</p>
            <a
              href="/occasions"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-md font-semibold hover:bg-primary/90 transition-colors"
            >
              <Gift className="h-4 w-4" />
              Shop occasions
            </a>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
