import { google, calendar_v3 } from 'googleapis';
import { readStoredToken, writeStoredToken } from './token-store';

const SOURCE_TAG = 'gig-hub-calendar';

// Cached client so access tokens are reused across requests and any rotated
// refresh tokens issued by Google are preserved within a server process.
let _authClient: InstanceType<typeof google.auth.OAuth2> | null = null;

function getRefreshToken(): string {
  const stored = readStoredToken();
  if (stored?.refresh_token) return stored.refresh_token;
  if (process.env.GOOGLE_REFRESH_TOKEN) return process.env.GOOGLE_REFRESH_TOKEN;
  throw new Error(
    'No Google refresh token. Visit /admin/auth to connect Google Calendar.'
  );
}

function getAuth() {
  if (!_authClient) {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    oauth2Client.setCredentials({ refresh_token: getRefreshToken() });
    // Persist any rotated refresh token Google issues alongside a new access
    // token. Without this, a server restart after rotation reloads the old
    // (now-invalidated) token and fails with invalid_grant.
    oauth2Client.on('tokens', (tokens) => {
      if (tokens.refresh_token) {
        writeStoredToken(tokens.refresh_token);
      }
    });
    _authClient = oauth2Client;
  }
  return _authClient;
}

export function updateRefreshToken(token: string): void {
  writeStoredToken(token);
  _authClient = null;
}

function isInvalidGrant(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'status' in err &&
    (err as { status: number }).status === 400 &&
    'message' in err &&
    (err as { message: string }).message === 'invalid_grant'
  );
}

async function withAuthErrorHandling<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (isInvalidGrant(err)) {
      // Discard the cached client so the next request re-reads env vars in
      // case the token was updated without restarting the server process.
      _authClient = null;
      throw new Error(
        'Google OAuth token is invalid or has been revoked (invalid_grant). ' +
          'Visit /admin/auth to reconnect Google Calendar.'
      );
    }
    throw err;
  }
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
  ticketSaleAlertSent: boolean;
  preEventAlertSent: boolean;
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
    ticketSaleAlertSent: props.ticketSaleAlertSent === 'true',
    preEventAlertSent: props.preEventAlertSent === 'true',
  };
}

export async function createGig(data: {
  artist: string;
  location: string;
  eventDate: Date;
  ticketUrl?: string;
  notes?: string;
}): Promise<Gig> {
  return withAuthErrorHandling(async () => {
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
        extendedProperties: {
          private: {
            source: SOURCE_TAG,
            ticketUrl: data.ticketUrl ?? '',
            ticketSaleDate: '',
            reminderDaysBefore: '3',
            ticketSaleAlertSent: 'false',
            preEventAlertSent: 'false',
          },
        },
      },
    });

    return eventToGig(event.data);
  });
}

export async function listGigs(upcomingOnly = false): Promise<Gig[]> {
  return withAuthErrorHandling(async () => {
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
  });
}

export async function getGig(id: string): Promise<Gig> {
  return withAuthErrorHandling(async () => {
    const calendar = getCalendar();
    const event = await calendar.events.get({ calendarId: CALENDAR_ID(), eventId: id });
    return eventToGig(event.data);
  });
}

export async function updateGig(
  id: string,
  updates: Partial<{
    notes: string | null;
    ticketUrl: string | null;
    ticketSaleDate: Date | null;
    reminderDaysBefore: number;
    ticketSaleAlertSent: boolean;
    preEventAlertSent: boolean;
  }>
): Promise<Gig> {
  return withAuthErrorHandling(async () => {
    const calendar = getCalendar();
    const existing = await calendar.events.get({ calendarId: CALENDAR_ID(), eventId: id });
    const existingProps = existing.data.extendedProperties?.private ?? {};

    const newProps: Record<string, string> = { ...existingProps };

    if ('ticketSaleDate' in updates) {
      newProps.ticketSaleDate = updates.ticketSaleDate ? updates.ticketSaleDate.toISOString() : '';
    }
    if (updates.reminderDaysBefore !== undefined) {
      newProps.reminderDaysBefore = String(updates.reminderDaysBefore);
    }
    if (updates.ticketSaleAlertSent !== undefined) {
      newProps.ticketSaleAlertSent = String(updates.ticketSaleAlertSent);
    }
    if (updates.preEventAlertSent !== undefined) {
      newProps.preEventAlertSent = String(updates.preEventAlertSent);
    }
    if ('ticketUrl' in updates) {
      newProps.ticketUrl = updates.ticketUrl ?? '';
    }

    const patchBody: calendar_v3.Schema$Event = {
      extendedProperties: { private: newProps },
    };
    if ('notes' in updates) {
      patchBody.description = updates.notes ?? '';
    }

    const updated = await calendar.events.patch({
      calendarId: CALENDAR_ID(),
      eventId: id,
      requestBody: patchBody,
    });

    return eventToGig(updated.data);
  });
}

export async function deleteGig(id: string): Promise<void> {
  return withAuthErrorHandling(async () => {
    const calendar = getCalendar();
    await calendar.events.delete({ calendarId: CALENDAR_ID(), eventId: id });
  });
}

export async function getGigsForAlertCheck(): Promise<Gig[]> {
  return withAuthErrorHandling(async () => {
    const calendar = getCalendar();

    const response = await calendar.events.list({
      calendarId: CALENDAR_ID(),
      privateExtendedProperty: [`source=${SOURCE_TAG}`],
      orderBy: 'startTime',
      singleEvents: true,
      maxResults: 250,
    });

    return (response.data.items ?? [])
      .map(eventToGig)
      .filter((gig) => !gig.ticketSaleAlertSent || !gig.preEventAlertSent);
  });
}
