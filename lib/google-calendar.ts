import { google, calendar_v3 } from 'googleapis';

const SOURCE_TAG = 'gig-hub-calendar';
const TICKET_SALE_TAG = 'gig-hub-ticket-sale';

// Google Calendar caps reminder overrides at 4 weeks (40320 minutes).
const MAX_REMINDER_MINUTES = 40320;

/** Native calendar reminder that pops `reminderDaysBefore` days before the gig. */
function preEventReminder(reminderDaysBefore: number): calendar_v3.Schema$Event['reminders'] {
  const minutes = Math.min(Math.max(reminderDaysBefore, 0) * 24 * 60, MAX_REMINDER_MINUTES);
  return { useDefault: false, overrides: [{ method: 'popup', minutes }] };
}

function getAuth() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
  });
  return oauth2Client;
}

function getCalendar() {
  return google.calendar({ version: 'v3', auth: getAuth() });
}

const CALENDAR_ID = () => process.env.GOOGLE_CALENDAR_ID || 'primary';

export interface Gig {
  id: string;
  artist: string;
  location: string;
  eventDate: Date;
  ticketUrl?: string;
  notes?: string;
  ticketSaleDate?: Date;
  reminderDaysBefore: number;
}

function eventToGig(event: calendar_v3.Schema$Event): Gig {
  const props = event.extendedProperties?.private ?? {};
  return {
    id: event.id!,
    artist: event.summary ?? '',
    location: event.location ?? '',
    eventDate: new Date(event.start?.dateTime ?? event.start?.date ?? ''),
    ticketUrl: props.ticketUrl || undefined,
    notes: event.description || undefined,
    ticketSaleDate: props.ticketSaleDate ? new Date(props.ticketSaleDate) : undefined,
    reminderDaysBefore: parseInt(props.reminderDaysBefore ?? '3', 10),
  };
}

export async function createGig(data: {
  artist: string;
  location: string;
  eventDate: Date;
  ticketUrl?: string;
  notes?: string;
}): Promise<Gig> {
  const calendar = getCalendar();
  const endDate = new Date(data.eventDate.getTime() + 2 * 60 * 60 * 1000);

  const event = await calendar.events.insert({
    calendarId: CALENDAR_ID(),
    requestBody: {
      summary: data.artist,
      location: data.location,
      description: data.notes ?? '',
      colorId: '5',
      start: { dateTime: data.eventDate.toISOString() },
      end: { dateTime: endDate.toISOString() },
      reminders: preEventReminder(3),
      extendedProperties: {
        private: {
          source: SOURCE_TAG,
          ticketUrl: data.ticketUrl ?? '',
          ticketSaleDate: '',
          ticketSaleEventId: '',
          reminderDaysBefore: '3',
        },
      },
    },
  });

  return eventToGig(event.data);
}

export async function listGigs(upcomingOnly = false): Promise<Gig[]> {
  const calendar = getCalendar();

  const params: calendar_v3.Params$Resource$Events$List = {
    calendarId: CALENDAR_ID(),
    privateExtendedProperty: [`source=${SOURCE_TAG}`],
    orderBy: 'startTime',
    singleEvents: true,
    maxResults: 250,
  };

  if (upcomingOnly) {
    params.timeMin = new Date().toISOString();
  }

  const response = await calendar.events.list(params);
  return (response.data.items ?? []).map(eventToGig);
}

export async function getGig(id: string): Promise<Gig> {
  const calendar = getCalendar();
  const event = await calendar.events.get({ calendarId: CALENDAR_ID(), eventId: id });
  return eventToGig(event.data);
}

async function deleteEventQuietly(
  calendar: calendar_v3.Calendar,
  eventId: string
): Promise<void> {
  try {
    await calendar.events.delete({ calendarId: CALENDAR_ID(), eventId });
  } catch {
    // Event already gone — nothing to clean up.
  }
}

/**
 * Creates or updates a dedicated calendar event for a gig's ticket sale, so the
 * ticket-on-sale time shows up in the user's calendar with a native reminder.
 * Returns the id of the ticket-sale event.
 */
async function upsertTicketSaleEvent(
  calendar: calendar_v3.Calendar,
  existingEventId: string | undefined,
  data: { artist: string; location: string; ticketUrl?: string; saleDate: Date; gigId: string }
): Promise<string> {
  const endDate = new Date(data.saleDate.getTime() + 30 * 60 * 1000);
  const requestBody: calendar_v3.Schema$Event = {
    summary: `🎫 Tickets on sale: ${data.artist}`,
    location: data.location,
    description:
      `Tickets go on sale for ${data.artist}${data.location ? ` at ${data.location}` : ''}.` +
      (data.ticketUrl ? `\n\n${data.ticketUrl}` : ''),
    colorId: '6',
    start: { dateTime: data.saleDate.toISOString() },
    end: { dateTime: endDate.toISOString() },
    reminders: {
      useDefault: false,
      overrides: [{ method: 'popup', minutes: 0 }],
    },
    extendedProperties: {
      private: { source: TICKET_SALE_TAG, gigId: data.gigId },
    },
  };

  if (existingEventId) {
    try {
      const updated = await calendar.events.patch({
        calendarId: CALENDAR_ID(),
        eventId: existingEventId,
        requestBody,
      });
      return updated.data.id!;
    } catch {
      // Old ticket-sale event was deleted out from under us — fall through and recreate.
    }
  }

  const created = await calendar.events.insert({
    calendarId: CALENDAR_ID(),
    requestBody,
  });
  return created.data.id!;
}

export async function updateGig(
  id: string,
  updates: Partial<{
    notes: string | null;
    ticketUrl: string | null;
    ticketSaleDate: Date | null;
    reminderDaysBefore: number;
  }>
): Promise<Gig> {
  const calendar = getCalendar();
  const existing = await calendar.events.get({ calendarId: CALENDAR_ID(), eventId: id });
  const existingProps = existing.data.extendedProperties?.private ?? {};

  const newProps: Record<string, string> = { ...existingProps };

  if ('ticketUrl' in updates) {
    newProps.ticketUrl = updates.ticketUrl ?? '';
  }
  if (updates.reminderDaysBefore !== undefined) {
    newProps.reminderDaysBefore = String(updates.reminderDaysBefore);
  }

  // Keep the dedicated ticket-sale calendar reminder in sync with the sale date.
  if ('ticketSaleDate' in updates) {
    const saleDate = updates.ticketSaleDate ?? null;
    newProps.ticketSaleDate = saleDate ? saleDate.toISOString() : '';
    const existingSaleEventId = existingProps.ticketSaleEventId || undefined;

    if (saleDate) {
      newProps.ticketSaleEventId = await upsertTicketSaleEvent(calendar, existingSaleEventId, {
        artist: existing.data.summary ?? '',
        location: existing.data.location ?? '',
        ticketUrl: newProps.ticketUrl || undefined,
        saleDate,
        gigId: id,
      });
    } else {
      if (existingSaleEventId) await deleteEventQuietly(calendar, existingSaleEventId);
      newProps.ticketSaleEventId = '';
    }
  }

  const patchBody: calendar_v3.Schema$Event = {
    extendedProperties: { private: newProps },
  };
  if ('notes' in updates) {
    patchBody.description = updates.notes ?? '';
  }
  if (updates.reminderDaysBefore !== undefined) {
    patchBody.reminders = preEventReminder(updates.reminderDaysBefore);
  }

  const updated = await calendar.events.patch({
    calendarId: CALENDAR_ID(),
    eventId: id,
    requestBody: patchBody,
  });

  return eventToGig(updated.data);
}

export async function deleteGig(id: string): Promise<void> {
  const calendar = getCalendar();

  // Clean up the linked ticket-sale reminder event, if one exists.
  try {
    const existing = await calendar.events.get({ calendarId: CALENDAR_ID(), eventId: id });
    const saleEventId = existing.data.extendedProperties?.private?.ticketSaleEventId;
    if (saleEventId) await deleteEventQuietly(calendar, saleEventId);
  } catch {
    // Gig already gone — nothing linked to clean up.
  }

  await calendar.events.delete({ calendarId: CALENDAR_ID(), eventId: id });
}
