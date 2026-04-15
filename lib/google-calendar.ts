import { google, calendar_v3 } from 'googleapis';

const SOURCE_TAG = 'gig-hub-calendar';
const TICKET_SALE_SOURCE_TAG = 'gig-hub-ticket-sale';
const DEFAULT_REMINDER_DAYS = 3;

function getAuth() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'urn:ietf:wg:oauth:2.0:oob'
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

// Google Calendar API max for reminders is 40320 minutes (28 days)
function reminderMinutes(days: number): number {
  return Math.min(days * 24 * 60, 40320);
}

export interface Gig {
  id: string;
  artist: string;
  location: string;
  eventDate: Date;
  ticketUrl?: string;
  notes?: string;
  ticketSaleDate?: Date;
  reminderDaysBefore: number;
  ticketSaleEventId?: string;
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
    reminderDaysBefore: parseInt(props.reminderDaysBefore ?? String(DEFAULT_REMINDER_DAYS), 10),
    ticketSaleEventId: props.ticketSaleEventId || undefined,
  };
}

async function createTicketSaleEvent(params: {
  gigId: string;
  artist: string;
  location: string;
  ticketUrl?: string;
  ticketSaleDate: Date;
}): Promise<string> {
  const calendar = getCalendar();
  const endDate = new Date(params.ticketSaleDate.getTime() + 30 * 60 * 1000);

  const event = await calendar.events.insert({
    calendarId: CALENDAR_ID(),
    requestBody: {
      summary: `Tickets on sale: ${params.artist} @ ${params.location}`,
      description: params.ticketUrl ?? '',
      start: { dateTime: params.ticketSaleDate.toISOString() },
      end: { dateTime: endDate.toISOString() },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 0 },
          { method: 'email', minutes: 60 },
        ],
      },
      extendedProperties: {
        private: {
          source: TICKET_SALE_SOURCE_TAG,
          gigId: params.gigId,
        },
      },
    },
  });

  return event.data.id!;
}

async function deleteTicketSaleEvent(eventId: string): Promise<void> {
  const calendar = getCalendar();
  try {
    await calendar.events.delete({ calendarId: CALENDAR_ID(), eventId });
  } catch {
    // Ignore if already deleted
  }
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
  const minutes = reminderMinutes(DEFAULT_REMINDER_DAYS);

  const event = await calendar.events.insert({
    calendarId: CALENDAR_ID(),
    requestBody: {
      summary: data.artist,
      location: data.location,
      description: data.notes ?? '',
      colorId: '5',
      start: { dateTime: data.eventDate.toISOString() },
      end: { dateTime: endDate.toISOString() },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes },
          { method: 'email', minutes },
        ],
      },
      extendedProperties: {
        private: {
          source: SOURCE_TAG,
          ticketUrl: data.ticketUrl ?? '',
          ticketSaleDate: '',
          reminderDaysBefore: String(DEFAULT_REMINDER_DAYS),
          ticketSaleEventId: '',
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

  // Handle ticket sale date change — create/delete companion event
  if ('ticketSaleDate' in updates) {
    const oldTicketSaleEventId = existingProps.ticketSaleEventId;
    if (oldTicketSaleEventId) {
      await deleteTicketSaleEvent(oldTicketSaleEventId);
    }

    if (updates.ticketSaleDate) {
      const artist = existing.data.summary ?? '';
      const location = existing.data.location ?? '';
      const ticketUrl = existingProps.ticketUrl || undefined;
      const newEventId = await createTicketSaleEvent({
        gigId: id,
        artist,
        location,
        ticketUrl,
        ticketSaleDate: updates.ticketSaleDate,
      });
      newProps.ticketSaleDate = updates.ticketSaleDate.toISOString();
      newProps.ticketSaleEventId = newEventId;
    } else {
      newProps.ticketSaleDate = '';
      newProps.ticketSaleEventId = '';
    }
  }

  const patchBody: calendar_v3.Schema$Event = {
    extendedProperties: { private: newProps },
  };

  if (updates.reminderDaysBefore !== undefined) {
    newProps.reminderDaysBefore = String(updates.reminderDaysBefore);
    const minutes = reminderMinutes(updates.reminderDaysBefore);
    patchBody.reminders = {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes },
        { method: 'email', minutes },
      ],
    };
  }

  if ('ticketUrl' in updates) {
    newProps.ticketUrl = updates.ticketUrl ?? '';
  }

  if ('notes' in updates) {
    patchBody.description = updates.notes ?? '';
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

  // Delete companion ticket sale event if one exists
  const existing = await calendar.events.get({ calendarId: CALENDAR_ID(), eventId: id });
  const ticketSaleEventId = existing.data.extendedProperties?.private?.ticketSaleEventId;
  if (ticketSaleEventId) {
    await deleteTicketSaleEvent(ticketSaleEventId);
  }

  await calendar.events.delete({ calendarId: CALENDAR_ID(), eventId: id });
}
