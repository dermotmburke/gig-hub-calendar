import type { Gig } from '@/lib/google-calendar';
import GigCard from './GigCard';

export default function GigList({ gigs }: { gigs: Gig[] }) {
  if (gigs.length === 0) {
    return (
      <div className="border-4 border-black dark:border-white p-12 text-center brutalist-shadow">
        <p className="text-4xl font-black uppercase tracking-tighter mb-4">NO GIGS SAVED YET</p>
        <p className="text-sm font-bold uppercase">Click a Save link in Slack to add one.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {gigs.map((gig) => (
        <GigCard key={gig.id} gig={gig} />
      ))}
    </div>
  );
}
