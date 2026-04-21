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

  let gigs: Awaited<ReturnType<typeof listGigs>>;
  let calendarError: string | null = null;
  try {
    gigs = await listGigs(!showPast);
  } catch (err) {
    gigs = [];
    calendarError = err instanceof Error ? err.message : 'Failed to load gigs from Google Calendar.';
    console.error('[gigs page]', err);
  }

  return (
    <div>
      <div className="flex items-end justify-between mb-8">
        <h1 className="font-headline text-4xl sm:text-6xl md:text-8xl uppercase tracking-tighter leading-none">
          ALL GIGS
        </h1>
        <a
          href={showPast ? '/gigs' : '/gigs?past=true'}
          className="text-xs font-black uppercase border-2 border-black dark:border-white px-3 py-1 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors shrink-0"
        >
          {showPast ? 'HIDE PAST' : 'SHOW PAST'}
        </a>
      </div>
      {calendarError ? (
        <p className="text-red-600 dark:text-red-400 font-mono text-sm">{calendarError}</p>
      ) : (
        <GigList gigs={gigs} />
      )}
    </div>
  );
}
