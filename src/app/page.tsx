import Link from 'next/link';
import { Gift, Wand2, Package, Truck, Star, ArrowRight, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { ChatWidget } from '@/components/chat/chat-widget';
import { AddressBanner } from '@/components/layout/address-banner';

export default function HomePage() {
  return (
		<div className="flex flex-col min-h-screen">
			<Navbar />
			<AddressBanner />

			<main className="flex-1">
				{/* Hero */}
				<section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-secondary/30 py-24 md:py-32">
					<div className="container mx-auto px-4 text-center">
						<div className="inline-flex items-center gap-2 rounded-full border bg-background px-4 py-1.5 text-sm text-muted-foreground mb-6 shadow-sm">
							<Star className="h-3.5 w-3.5 text-primary fill-primary" />
							Delivering joy from the diaspora to Nigeria
						</div>
						<h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 max-w-3xl mx-auto">
							Send the perfect gift to <span className="text-primary">loved ones in Nigeria</span>
						</h1>
						<p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">Browse curated gift bundles for every occasion — birthdays, Christmas, Eid, and more — or build a completely custom experience. We handle everything from curation to delivery.</p>
						<div className="flex flex-col sm:flex-row gap-4 justify-center">
							<Button size="lg" className="gap-2 text-base" asChild>
								<Link href="/occasions">
									<Gift className="h-5 w-5" />
									Shop occasions
								</Link>
							</Button>
							<Button size="lg" variant="outline" className="gap-2 text-base" asChild>
								<Link href="/custom">
									<Wand2 className="h-5 w-5" />
									Build custom gift
								</Link>
							</Button>
						</div>
					</div>
				</section>

				<Separator />
				{/* How it works */}
				<section className="py-20 bg-background">
					<div className="container mx-auto px-4">
						<div className="text-center mb-14">
							<h2 className="text-3xl font-bold mb-3">How it works</h2>
							<p className="text-muted-foreground text-lg max-w-xl mx-auto">Sending a gift to Nigeria has never been this easy.</p>
						</div>
						<div className="grid md:grid-cols-3 gap-8">
							{[
								{
									icon: Gift,
									step: "01",
									title: "Choose or build",
									desc: "Pick from our curated occasion bundles or describe exactly what you want with our custom gift builder.",
								},
								{
									icon: Package,
									step: "02",
									title: "We curate & confirm",
									desc: "Our Nigeria-based team sources, packs, and confirms your order with a personalised message.",
								},
								{
									icon: Truck,
									step: "03",
									title: "Delivered with love",
									desc: "Your gift is hand-delivered to the recipient anywhere in Nigeria. Track it in real time.",
								},
							].map((item) => (
								<div key={item.step} className="text-center group">
									<div className="relative inline-flex mb-5">
										<div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
											<item.icon className="h-7 w-7 text-primary" />
										</div>
										<span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{item.step}</span>
									</div>
									<h3 className="font-semibold text-lg mb-2">{item.title}</h3>
									<p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
								</div>
							))}
						</div>
					</div>
				</section>

				<Separator />

				{/* Occasions preview */}
				<section className="py-20 bg-muted/30">
					<div className="container mx-auto px-4">
						<div className="flex items-center justify-between mb-10">
							<div>
								<h2 className="text-3xl font-bold mb-2">Shop by occasion</h2>
								<p className="text-muted-foreground">Every celebration, perfectly covered.</p>
							</div>
							<Button variant="outline" asChild className="hidden sm:flex gap-1">
								<Link href="/occasions">
									View all <ArrowRight className="h-4 w-4" />
								</Link>
							</Button>
						</div>
						<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
							{[
								{ emoji: "🎂", name: "Birthday", slug: "birthday" },
								{ emoji: "🎄", name: "Christmas", slug: "christmas" },
								{ emoji: "🌙", name: "Eid", slug: "eid" },
								{ emoji: "💝", name: "Valentine's", slug: "valentines" },
							].map((o) => (
								<Link key={o.slug} href={`/occasions/${o.slug}`} className="group flex flex-col items-center justify-center gap-3 rounded-xl border bg-background p-6 hover:border-primary hover:shadow-sm transition-all">
									<span className="text-4xl group-hover:scale-110 transition-transform">{o.emoji}</span>
									<span className="font-medium text-sm">{o.name}</span>
								</Link>
							))}
						</div>
						<div className="text-center mt-6 sm:hidden">
							<Button variant="outline" asChild>
								<Link href="/occasions">View all occasions</Link>
							</Button>
						</div>
					</div>
				</section>

				{/* Why us */}
				<section className="py-20 bg-background">
					<div className="container mx-auto px-4">
						<div className="text-center mb-12">
							<h2 className="text-3xl font-bold mb-3">Why choose CelebrateForMe?</h2>
						</div>
						<div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
							{[
								{ title: "Pay in CAD, USD or GBP", desc: "No currency headaches. Pay from anywhere in the world using your local currency." },
								{ title: "Real-time delivery tracking", desc: "Know exactly when your gift arrives. Live updates sent to you the moment status changes." },
								{ title: "Curated by locals", desc: "Every bundle is handpicked by our Nigeria-based team who know what recipients love." },
								{ title: "Custom gifts, done right", desc: "Describe what you want. We source it, pack it, and deliver it — no compromise." },
								{ title: "Secure payments via Stripe", desc: "Your payment data never touches our servers. Powered by Stripe's bank-grade security." },
								{ title: "Delivering across Nigeria", desc: "Lagos, Abuja, Port Harcourt, and beyond. If they're in Nigeria, we'll reach them." },
							].map((item) => (
								<Card key={item.title} className="border-none shadow-none bg-muted/40">
									<CardContent className="p-5">
										<CheckCircle className="h-5 w-5 text-primary mb-3" />
										<h3 className="font-semibold mb-1">{item.title}</h3>
										<p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
									</CardContent>
								</Card>
							))}
						</div>
					</div>
				</section>

				{/* CTA */}
				<section className="py-20 bg-primary text-primary-foreground">
					<div className="container mx-auto px-4 text-center">
						<h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to make someone's day?</h2>
						<p className="text-primary-foreground/80 text-lg mb-8 max-w-xl mx-auto">Join thousands of diaspora Nigerians already sending gifts home with CelebrateForMe.</p>
						<div className="flex flex-col sm:flex-row gap-4 justify-center">
							<Button size="lg" variant="secondary" asChild className="text-base font-semibold px-8">
								<Link href="/register">Create free account</Link>
							</Button>
							<Button size="lg" variant="outline" asChild className="text-base font-semibold px-8 border-2 border-white/70 text-white bg-transparent hover:bg-white/10 hover:text-white">
								<Link href="/occasions">Browse occasions</Link>
							</Button>
						</div>
					</div>
				</section>
			</main>

			<Footer />
			<ChatWidget />
		</div>
	);
}
