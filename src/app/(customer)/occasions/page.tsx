import { Suspense } from 'react';

export const metadata = { title: 'Shop by Occasion — CelebrateForMe' };

export default function OccasionsPage() {
  return (
    <main className="container mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8">Shop by Occasion</h1>
      <Suspense fallback={<p>Loading occasions...</p>}>
        {/* OccasionGrid component goes here */}
      </Suspense>
    </main>
  );
}
