import Link from 'next/link';
import type { Gig } from '@/lib/google-calendar';

function getDaysUntil(date: Date): number {
  const now = new Date();
  return Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function Hourglass() {
  return (
    <svg width="10" height="12" viewBox="0 0 10 12" fill="currentColor">
      {/* top trapezoid */}
      <polygon points="1,1 9,1 7,5 3,5" />
      {/* bottom trapezoid */}
      <polygon points="3,7 7,7 9,11 1,11" />
      {/* top bar */}
      <rect x="0" y="0" width="10" height="1.5" />
      {/* bottom bar */}
      <rect x="0" y="10.5" width="10" height="1.5" />
    </svg>
  );
}

export default function GigCard({ gig }: { gig: Gig }) {
  const daysUntil = getDaysUntil(gig.eventDate);
  const isPast = daysUntil < 0;

  const formattedDate = gig.eventDate.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const formattedTime = gig.eventDate.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      className={`border-4 border-black dark:border-white p-5 flex flex-col gap-4 ${
        isPast ? 'opacity-50' : 'brutalist-shadow'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-2xl font-black uppercase tracking-tighter leading-none">
            {gig.artist}
          </h2>
          <p className="text-xs font-bold uppercase mt-1">{gig.location}</p>
          <p className="text-xs font-medium mt-1 text-gray-600 dark:text-gray-400">
            {formattedDate} · {formattedTime}
          </p>
        </div>
        {!isPast && (
          <span
            className={`text-xs font-black px-2 py-1 shrink-0 border-2 border-black dark:border-white ${
              daysUntil <= 3 ? 'bg-black text-white dark:bg-white dark:text-black' : ''
            }`}
          >
            {daysUntil === 0 ? 'TODAY' : daysUntil === 1 ? 'TOMORROW' : `${daysUntil}D`}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3 text-xs font-black uppercase">
        {gig.ticketUrl && (
          <a
            href={gig.ticketUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-black text-white dark:bg-white dark:text-black px-3 py-1 hover:invert transition-all active:translate-x-0.5 active:translate-y-0.5"
          >
            TICKETS ↗
          </a>
        )}
        <Link
          href={`/gigs/${gig.id}`}
          className="border-2 border-black dark:border-white px-3 py-1 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
        >
          DETAILS
        </Link>
        <Link
          href={`/gigs/${gig.id}/edit`}
          className="hover:underline decoration-2"
        >
          EDIT
        </Link>
      </div>

      {!isPast && (
        <div className="flex flex-wrap gap-2">
          {gig.ticketSaleDate && (
            <span
              className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 font-bold border-2 ${
                gig.ticketSaleAlertSent
                  ? 'bg-black text-white border-black dark:bg-white dark:text-black dark:border-white'
                  : 'border-black dark:border-white'
              }`}
            >
              {gig.ticketSaleAlertSent ? (
                <>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                    <polyline points="1,5 4,8 9,2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square"/>
                  </svg>
                  TICKET ALERT SENT
                </>
              ) : (
                <>
                  <Hourglass />
                  TICKET SALE ALERT SET
                </>
              )}
            </span>
          )}
          <span
            className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 font-bold border-2 ${
              gig.preEventAlertSent
                ? 'bg-black text-white border-black dark:bg-white dark:text-black dark:border-white'
                : 'border-black dark:border-white'
            }`}
          >
            {gig.preEventAlertSent ? (
              <>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                  <polyline points="1,5 4,8 9,2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square"/>
                </svg>
                EVENT REMINDER SENT
              </>
            ) : (
              <>
                <Hourglass />
                {`REMINDER ${gig.reminderDaysBefore}D BEFORE`}
              </>
            )}
          </span>
        </div>
      )}
    </div>
  );
}
