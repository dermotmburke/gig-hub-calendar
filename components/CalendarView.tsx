'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Gig } from '@/lib/google-calendar';

interface GigJson {
  id: string;
  artist: string;
  location: string;
  eventDate: string;
  ticketUrl?: string;
  notes?: string;
  ticketSaleDate?: string;
  reminderDaysBefore: number;
  ticketSaleEventId?: string;
}

interface AddGigModalProps {
  date: Date;
  onClose: () => void;
  onSaved: () => void;
}

function AddGigModal({ date, onClose, onSaved }: AddGigModalProps) {
  const defaultDatetime = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T20:00`;

  const [artist, setArtist] = useState('');
  const [location, setLocation] = useState('');
  const [eventDatetime, setEventDatetime] = useState(defaultDatetime);
  const [ticketUrl, setTicketUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!artist.trim() || !location.trim()) return;
    setSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/gigs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          artist: artist.trim(),
          location: location.trim(),
          eventDate: new Date(eventDatetime).toISOString(),
          ticketUrl: ticketUrl.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });

      if (!res.ok) throw new Error('Failed to save');
      onSaved();
    } catch {
      setError('Failed to save. Please try again.');
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white border-4 border-black brutalist-shadow w-full max-w-md mx-4">
        <div className="flex items-center justify-between border-b-4 border-black px-6 py-4">
          <h2 className="text-xl font-black uppercase tracking-tighter">ADD GIG</h2>
          <button
            onClick={onClose}
            className="font-black text-xl hover:bg-black hover:text-white w-8 h-8 flex items-center justify-center transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-black uppercase tracking-widest mb-1">
              ARTIST *
            </label>
            <input
              type="text"
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              placeholder="Artist or band name"
              required
              autoFocus
              className="w-full bg-white border-2 border-black px-3 py-2 text-sm font-medium placeholder-gray-400 focus:outline-none focus:border-[4px]"
            />
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-widest mb-1">
              VENUE *
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Venue name and city"
              required
              className="w-full bg-white border-2 border-black px-3 py-2 text-sm font-medium placeholder-gray-400 focus:outline-none focus:border-[4px]"
            />
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-widest mb-1">
              DATE &amp; TIME *
            </label>
            <input
              type="datetime-local"
              value={eventDatetime}
              onChange={(e) => setEventDatetime(e.target.value)}
              required
              className="w-full bg-white border-2 border-black px-3 py-2 text-sm font-medium focus:outline-none focus:border-[4px]"
            />
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-widest mb-1">
              TICKET URL
            </label>
            <input
              type="url"
              value={ticketUrl}
              onChange={(e) => setTicketUrl(e.target.value)}
              placeholder="https://..."
              className="w-full bg-white border-2 border-black px-3 py-2 text-sm font-medium placeholder-gray-400 focus:outline-none focus:border-[4px]"
            />
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-widest mb-1">
              NOTES
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything to remember..."
              rows={2}
              className="w-full bg-white border-2 border-black px-3 py-2 text-sm font-medium placeholder-gray-400 focus:outline-none focus:border-[4px] resize-none"
            />
          </div>

          {error && (
            <p className="text-xs font-black uppercase border-2 border-black px-3 py-2">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-black text-white font-black uppercase text-sm px-5 py-3 disabled:opacity-50 hover:invert transition-all active:translate-x-0.5 active:translate-y-0.5"
            >
              {saving ? 'SAVING…' : 'SAVE GIG'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-3 text-sm font-black uppercase border-2 border-black hover:bg-black hover:text-white transition-colors"
            >
              CANCEL
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const MONTHS = [
  'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
  'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER',
];

function getMonthGrid(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  // Convert to Mon-first: Sun=6, Mon=0, ..., Sat=5
  const offset = (firstDay + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = Array(offset).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return cells;
}

export default function CalendarView({ initialGigs }: { initialGigs: GigJson[] }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [gigs, setGigs] = useState<GigJson[]>(initialGigs);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [loadingGigs, setLoadingGigs] = useState(false);

  const fetchGigs = useCallback(async () => {
    setLoadingGigs(true);
    try {
      const res = await fetch('/api/gigs');
      if (res.ok) setGigs(await res.json());
    } finally {
      setLoadingGigs(false);
    }
  }, []);

  useEffect(() => {
    fetchGigs();
  }, [fetchGigs]);

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  }

  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  }

  const grid = getMonthGrid(year, month);

  // Build a map: "YYYY-M-D" -> gigs[]
  const gigsByDay: Record<string, GigJson[]> = {};
  for (const gig of gigs) {
    const d = new Date(gig.eventDate);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (!gigsByDay[key]) gigsByDay[key] = [];
    gigsByDay[key].push(gig);
  }

  function handleDayClick(day: number) {
    setSelectedDay(new Date(year, month, day));
  }

  function handleSaved() {
    setSelectedDay(null);
    fetchGigs();
  }

  return (
    <div className={loadingGigs ? 'opacity-75 transition-opacity' : ''}>
      {/* Calendar header */}
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-6xl md:text-8xl font-black uppercase tracking-tighter leading-none">
            {MONTHS[month]}
          </h1>
          <p className="text-lg font-bold mt-1">{year}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={prevMonth}
            className="border-4 border-black px-4 py-3 font-black hover:bg-black hover:text-white transition-colors active:translate-x-0.5 active:translate-y-0.5"
          >
            ←
          </button>
          <button
            onClick={nextMonth}
            className="border-4 border-black px-4 py-3 font-black hover:bg-black hover:text-white transition-colors active:translate-x-0.5 active:translate-y-0.5"
          >
            →
          </button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 border-t-4 border-l-4 border-black">
        {DAYS.map((d) => (
          <div key={d} className="border-r-4 border-b-4 border-black p-2 text-xs font-black uppercase text-center">
            {d}
          </div>
        ))}

        {grid.map((day, i) => {
          if (day === null) {
            return (
              <div
                key={`empty-${i}`}
                className="border-r-4 border-b-4 border-black p-2 min-h-[100px] bg-surface-container"
              />
            );
          }

          const key = `${year}-${month}-${day}`;
          const dayGigs = gigsByDay[key] ?? [];
          const isToday =
            today.getFullYear() === year &&
            today.getMonth() === month &&
            today.getDate() === day;

          return (
            <button
              key={day}
              onClick={() => handleDayClick(day)}
              className={`border-r-4 border-b-4 border-black p-2 min-h-[100px] text-left relative group transition-colors ${
                isToday ? 'bg-black text-white' : 'hover:bg-surface-container'
              }`}
            >
              <span className={`text-sm font-black ${isToday ? 'text-white' : ''}`}>{day}</span>

              {/* Gig dots */}
              <div className="mt-2 flex flex-col gap-1">
                {dayGigs.slice(0, 3).map((gig) => (
                  <div
                    key={gig.id}
                    className={`text-[10px] font-black uppercase leading-tight truncate px-1 ${
                      isToday ? 'bg-white text-black' : 'bg-black text-white'
                    }`}
                    title={gig.artist}
                  >
                    {gig.artist}
                  </div>
                ))}
                {dayGigs.length > 3 && (
                  <div className={`text-[10px] font-black ${isToday ? 'text-white' : ''}`}>
                    +{dayGigs.length - 3} MORE
                  </div>
                )}
              </div>

              {/* Add hint on hover */}
              {dayGigs.length === 0 && (
                <div className={`absolute bottom-2 right-2 text-[10px] font-black uppercase opacity-0 group-hover:opacity-100 transition-opacity ${
                  isToday ? 'text-white' : 'text-black'
                }`}>
                  + ADD
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <p className="text-xs font-bold uppercase mt-4 text-gray-500">
        CLICK ANY DAY TO ADD A GIG
      </p>

      {/* Add gig modal */}
      {selectedDay && (
        <AddGigModal
          date={selectedDay}
          onClose={() => setSelectedDay(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
