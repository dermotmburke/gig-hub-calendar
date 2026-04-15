import { getGig } from '@/lib/google-calendar';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function GigDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const gig = await getGig(id);

  const formattedDate = gig.eventDate.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const formattedTime = gig.eventDate.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const now = new Date();
  const daysUntil = Math.ceil(
    (gig.eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );
  const isPast = daysUntil < 0;

  return (
    <div className="max-w-2xl">
      <Link
        href="/gigs"
        className="text-xs font-black uppercase hover:underline decoration-2 mb-8 block"
      >
        ← ALL GIGS
      </Link>

      <div className="border-4 border-black p-6 brutalist-shadow space-y-6">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-4xl font-black uppercase tracking-tighter leading-none">
            {gig.artist}
          </h1>
          {!isPast && (
            <span
              className={`text-xs font-black px-2 py-1 shrink-0 border-2 border-black ${
                daysUntil <= 3 ? 'bg-black text-white' : ''
              }`}
            >
              {daysUntil === 0 ? 'TODAY' : daysUntil === 1 ? 'TOMORROW' : `${daysUntil} DAYS`}
            </span>
          )}
        </div>

        <div className="space-y-1">
          <p className="text-sm font-bold uppercase">{gig.location}</p>
          <p className="text-sm font-medium">
            {formattedDate} at {formattedTime}
          </p>
        </div>

        {gig.ticketUrl && (
          <a
            href={gig.ticketUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-black text-white font-black text-xs uppercase px-4 py-2 hover:invert transition-all active:translate-x-0.5 active:translate-y-0.5"
          >
            BUY TICKETS ↗
          </a>
        )}

        <div className="border-t-4 border-black pt-4 space-y-2">
          <h2 className="text-xs font-black uppercase tracking-widest">REMINDERS</h2>
          <div className="flex flex-col gap-2 text-sm font-medium">
            <span className={gig.ticketSaleDate ? '' : 'opacity-40'}>
              {gig.ticketSaleDate ? (
                <>
                  TICKET SALE:{' '}
                  {gig.ticketSaleDate.toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                  <span className="ml-2 text-xs font-black border-2 border-black px-1">
                    ON CALENDAR
                  </span>
                </>
              ) : (
                'NO TICKET SALE DATE SET'
              )}
            </span>
            <span>
              REMINDER: {gig.reminderDaysBefore} DAY{gig.reminderDaysBefore === 1 ? '' : 'S'} BEFORE
            </span>
          </div>
        </div>

        {gig.notes && (
          <div className="border-t-4 border-black pt-4">
            <h2 className="text-xs font-black uppercase tracking-widest mb-2">NOTES</h2>
            <p className="text-sm font-medium whitespace-pre-wrap">{gig.notes}</p>
          </div>
        )}
      </div>

      <div className="mt-6">
        <Link
          href={`/gigs/${id}/edit`}
          className="bg-black text-white font-black text-xs uppercase px-5 py-3 inline-block hover:invert transition-all active:translate-x-0.5 active:translate-y-0.5"
        >
          EDIT / SET ALERTS
        </Link>
      </div>
    </div>
  );
}
