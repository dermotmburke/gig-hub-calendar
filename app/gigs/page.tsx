import { listGigs } from '@/lib/google-calendar';
import GigList from '@/components/GigList';

export const dynamic = 'force-dynamic';

export default async function GigsPage({
  searchParams,
}: {
  searchParams: Promise<{ past?: string }>;
}) {
  const params = await searchParams;
  const showPast = params.past === 'true';
  const gigs = await listGigs(!showPast);

  return (
    <div>
      <div className="flex items-end justify-between mb-8">
        <h1 className="text-6xl md:text-8xl font-black uppercase tracking-tighter leading-none">
          ALL GIGS
        </h1>
        <a
          href={showPast ? '/gigs' : '/gigs?past=true'}
          className="text-xs font-black uppercase border-2 border-black dark:border-white px-3 py-1 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors shrink-0"
        >
          {showPast ? 'HIDE PAST' : 'SHOW PAST'}
        </a>
      </div>
      <GigList gigs={gigs} />
    </div>
  );
}
