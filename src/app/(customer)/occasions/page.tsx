import type { Metadata } from 'next';
import { OccasionsClientPage } from './occasions-client';

export const metadata: Metadata = { title: 'Shop by Occasion — Luvngift' };

export default function OccasionsPage() {
  return <OccasionsClientPage />;
}
