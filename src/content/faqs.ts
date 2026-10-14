export interface FAQ {
  question: string;
  answer: string;
}

/**
 * Service-wide FAQs. Used on the home page and the dedicated /faq page, and
 * emitted as FAQPage structured data for rich results / "People Also Ask".
 * Keep answers factual and consistent with how the platform actually works.
 */
export const GENERAL_FAQS: FAQ[] = [
  {
    question: 'How do I send a gift to Nigeria from abroad?',
    answer:
      'Choose a curated bundle for your occasion or build a custom gift, enter the recipient’s delivery address in Nigeria, add a personal message, and pay securely with your card. Our Nigeria-based team sources, packs, and hand-delivers the gift — no contacts on the ground required.',
  },
  {
    question: 'How long does delivery to Nigeria take?',
    answer:
      'Each bundle shows its own estimated delivery window, and you’ll see that window again on the order review before you pay. Timing depends on the bundle and destination — major cities are fastest; more remote areas take a little longer. You’ll receive status updates by email and SMS, and you can track the order from your account at every stage.',
  },
  {
    question: 'Which parts of Nigeria do you deliver to?',
    answer:
      'We deliver nationwide — including Lagos, Abuja, Port Harcourt, Ibadan, Kano, Benin City, Enugu, and beyond. If your recipient has an address in Nigeria, we can reach them. Deliveries outside the major cities can take a little longer.',
  },
  {
    question: 'How much does delivery cost?',
    answer:
      'Delivery within Nigeria is included in the bundle price — there is no separate delivery fee. The total shown on the order review before you pay is the amount you are charged.',
  },
  {
    question: 'When will I be charged?',
    answer:
      'Your card is charged when you complete payment at checkout, after you have reviewed the full order and total. Nothing is taken before that. Custom gift requests work differently: you submit the request with no payment, we price it, and you pay only once you have seen and accepted the quote.',
  },
  {
    question: 'What currencies can I pay in?',
    answer:
      'You can pay in US Dollars (USD), Canadian Dollars (CAD), or British Pounds (GBP). Prices are shown in your local currency automatically, so there are no conversion surprises at checkout.',
  },
  {
    question: 'Is my payment secure?',
    answer:
      'Yes. All payments are processed by Stripe with bank-grade encryption. Your full card details never touch our servers.',
  },
  {
    question: 'Will the recipient see how much I paid?',
    answer:
      'No. The invoice is sent only to you, the buyer. Your recipient receives the gift along with any personal message you include — never a price or receipt.',
  },
  {
    question: 'Can I include a personal message with my gift?',
    answer:
      'Absolutely. During checkout you can add a personal message that we present beautifully with the gift, so it feels personal even from thousands of miles away.',
  },
  {
    question: 'Can I track my order?',
    answer:
      'Yes. Every order is tracked in real time. You’ll see live status changes — from processing to out for delivery to delivered — in your account, with notifications sent by email and SMS.',
  },
  {
    question: 'What if I can’t find the right bundle?',
    answer:
      'Use our custom gift builder to describe exactly what you want. Our team will source and curate it for you, then deliver it anywhere in Nigeria.',
  },
  {
    question: 'Do I need to create an account to order?',
    answer:
      'Yes — a free account lets you save your billing address, track deliveries in real time, view invoices, and reorder favourites quickly.',
  },
];
