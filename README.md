# gig-hub-calendar

A companion app for [gig-hub](https://github.com/dermotmburke/gig-hub). Click a link in a Slack message to save a gig, then view your saved events and get Google Calendar reminders when tickets go on sale and before a gig.

**Stack:** Next.js 15 · TypeScript · Google Calendar API · Tailwind CSS

---

## How it works

1. `gig-hub` posts events to Slack — each event includes a 💾 Save link
2. Clicking the link opens `http://localhost:3000/save?artist=...` which saves the event to your Google Calendar (tagged so it's visible in this app)
3. Open `http://localhost:3000` to see your saved gigs, set ticket sale dates, and configure reminders
4. Reminders are native Google Calendar reminders: setting a ticket sale date adds a reminder event for when tickets go on sale, and each gig gets a popup reminder the configured number of days before

---

## Setup

### 1. Prerequisites

- Node.js 20+
- A Google account
- A Slack workspace (used by gig-hub to post the 💾 Save links)

### 2. Google Calendar API

1. Go to [Google Cloud Console](https://console.cloud.google.com) and create a new project
2. Enable the **Google Calendar API** (APIs & Services → Library)
3. Create **OAuth 2.0 credentials** (APIs & Services → Credentials → Create Credentials → OAuth client ID)
   - Application type: **Desktop App**
4. Copy the **Client ID** and **Client Secret** — you'll add these to `.env.local` in the next step

### 3. Configure environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and fill in `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

### 4. Get your Google refresh token

```bash
npm install
npm run auth
```

Follow the prompts — it will print your `GOOGLE_REFRESH_TOKEN`. Add it to `.env.local`.

### 5. Connect gig-hub

Set the `GIG_SAVER_URL` environment variable when running gig-hub:

```bash
GIG_SAVER_URL=http://localhost:3000 java -jar gig-hub.jar
```

Each Slack notification will now include a 💾 Save link per event.

---

## Running

```bash
# Development
npm run dev

# Production
npm run build
npm run start
```

Reminders are delivered by Google Calendar itself, so there's no background process to run.

---

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `GOOGLE_CLIENT_ID` | Yes | OAuth2 client ID from Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Yes | OAuth2 client secret |
| `GOOGLE_REFRESH_TOKEN` | Yes | From `npm run auth` |
| `GOOGLE_CALENDAR_ID` | No | Calendar to use (default: `primary`) |
