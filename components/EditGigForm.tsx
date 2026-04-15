'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Gig } from '@/lib/google-calendar';

export default function EditGigForm({ gig }: { gig: Gig }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [ticketUrl, setTicketUrl] = useState(gig.ticketUrl ?? '');
  const [ticketSaleDate, setTicketSaleDate] = useState(
    gig.ticketSaleDate ? gig.ticketSaleDate.toISOString().slice(0, 16) : ''
  );
  const [reminderDaysBefore, setReminderDaysBefore] = useState(gig.reminderDaysBefore);
  const [notes, setNotes] = useState(gig.notes ?? '');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/gigs/${gig.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketUrl: ticketUrl || null,
          ticketSaleDate: ticketSaleDate || null,
          reminderDaysBefore,
          notes: notes || null,
        }),
      });

      if (!res.ok) throw new Error('Save failed');

      router.push(`/gigs/${gig.id}`);
      router.refresh();
    } catch {
      setError('Failed to save. Please try again.');
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Remove "${gig.artist}" from your saved gigs?`)) return;

    const res = await fetch(`/api/gigs/${gig.id}`, { method: 'DELETE' });
    if (res.ok) {
      router.push('/gigs');
      router.refresh();
    }
  }

  const inputClass = 'w-full bg-white dark:bg-black border-2 border-black dark:border-white px-3 py-2 text-sm font-medium placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-[4px]';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-xs font-black uppercase tracking-widest mb-2">
          TICKET URL
        </label>
        <input
          type="url"
          value={ticketUrl}
          onChange={(e) => setTicketUrl(e.target.value)}
          placeholder="https://ticketmaster.com/..."
          className={inputClass}
        />
      </div>

      <div>
        <label className="block text-xs font-black uppercase tracking-widest mb-2">
          TICKET SALE DATE{' '}
          <span className="font-medium normal-case tracking-normal">(leave blank if unknown)</span>
        </label>
        <input
          type="datetime-local"
          value={ticketSaleDate}
          onChange={(e) => setTicketSaleDate(e.target.value)}
          className={inputClass}
        />
        <p className="text-xs font-medium mt-1 text-gray-500 dark:text-gray-400">
          You&apos;ll get a Slack DM when this date arrives.
        </p>
      </div>

      <div>
        <label className="block text-xs font-black uppercase tracking-widest mb-2">
          PRE-EVENT REMINDER
        </label>
        <div className="flex items-center gap-3">
          <input
            type="number"
            min={1}
            max={30}
            value={reminderDaysBefore}
            onChange={(e) => setReminderDaysBefore(parseInt(e.target.value, 10))}
            className="w-20 bg-white dark:bg-black border-2 border-black dark:border-white px-3 py-2 text-sm font-medium focus:outline-none focus:border-[4px]"
          />
          <span className="text-xs font-black uppercase">DAYS BEFORE THE GIG</span>
        </div>
        <p className="text-xs font-medium mt-1 text-gray-500 dark:text-gray-400">
          You&apos;ll get a Slack DM this many days before.
        </p>
      </div>

      <div>
        <label className="block text-xs font-black uppercase tracking-widest mb-2">NOTES</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Anything to remember..."
          rows={3}
          className={`${inputClass} resize-none`}
        />
      </div>

      {error && (
        <p className="text-xs font-black uppercase border-2 border-black dark:border-white px-3 py-2">{error}</p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 bg-black text-white dark:bg-white dark:text-black font-black uppercase text-sm px-5 py-3 disabled:opacity-50 hover:invert transition-all active:translate-x-0.5 active:translate-y-0.5"
        >
          {saving ? 'SAVING…' : 'SAVE CHANGES'}
        </button>
        <button
          type="button"
          onClick={handleDelete}
          className="px-4 py-3 text-sm font-black uppercase border-2 border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
        >
          REMOVE
        </button>
      </div>
    </form>
  );
}
