import Link from 'next/link';
import Image from 'next/image';
import { Separator } from '@/components/ui/separator';

export function Footer() {
  return (
		<footer className="border-t bg-background mt-auto">
			<div className="container mx-auto px-4 py-10">
				<div className="grid grid-cols-2 md:grid-cols-5 gap-8">
					<div className="col-span-2 md:col-span-1">
						<Link href="/" className="flex items-center gap-2 mb-3 w-fit">
							<Image src="/images/luvngift.png" alt="Luvngift" width={56} height={56} className="object-contain" />
							<span className="text-xl font-bold tracking-tight text-foreground leading-none">
								Luv<span className="text-primary">N</span>gift
							</span>
						</Link>
						<p className="text-sm text-muted-foreground leading-relaxed">Send curated gifts and experiences to your loved ones in Nigeria from anywhere in the world.</p>
					</div>

					<div>
						<h4 className="text-sm font-semibold mb-3">Shop</h4>
						<ul className="space-y-2 text-sm text-muted-foreground">
							<li>
								<Link href="/occasions" className="hover:text-foreground transition-colors">
									Occasions
								</Link>
							</li>
							<li>
								<Link href="/custom" className="hover:text-foreground transition-colors">
									Custom Gift
								</Link>
							</li>
						</ul>
					</div>

					<div>
						<h4 className="text-sm font-semibold mb-3">Account</h4>
						<ul className="space-y-2 text-sm text-muted-foreground">
							<li>
								<Link href="/orders" className="hover:text-foreground transition-colors">
									My Orders
								</Link>
							</li>
							<li>
								<Link href="/account" className="hover:text-foreground transition-colors">
									Profile
								</Link>
							</li>
						</ul>
					</div>

					<div>
						<h4 className="text-sm font-semibold mb-3">Company</h4>
						<ul className="space-y-2 text-sm text-muted-foreground">
							<li>
								<Link href="/about" className="hover:text-foreground transition-colors">
									About us
								</Link>
							</li>
							<li>
								<Link href="/contact" className="hover:text-foreground transition-colors">
									Contact us
								</Link>
							</li>
						</ul>
					</div>

					<div>
						<h4 className="text-sm font-semibold mb-3">Support</h4>
						<ul className="space-y-2 text-sm text-muted-foreground">
							<li>
								<span className="cursor-pointer hover:text-foreground transition-colors">Live Chat</span>
							</li>
						</ul>
					</div>
				</div>

				<Separator className="my-8" />

				<div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
					<p>&copy; {new Date().getFullYear()} LuvNgift. All rights reserved.</p>
					<p className="text-xs">Accepting CAD · USD · GBP. Delivering across Nigeria.</p>
				</div>
			</div>
		</footer>
	);
}
