/**
 * One-time Google OAuth2 setup.
 *
 * Usage:
 *   npm run auth
 *
 * Prerequisites:
 *   1. Go to https://console.cloud.google.com
 *   2. Create a project and enable the Google Calendar API
 *   3. Create OAuth 2.0 credentials (Application type: Desktop App)
 *   4. Copy Client ID and Client Secret into .env.local as:
 *        GOOGLE_CLIENT_ID=...
 *        GOOGLE_CLIENT_SECRET=...
 *   5. Run this script — your browser will open automatically and the
 *      GOOGLE_REFRESH_TOKEN will be printed once you approve access.
 */

import { google } from 'googleapis';
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';

// Load .env.local so this script works when run directly via ts-node
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const match = line.match(/^([^#=\s][^=]*)=(.*)$/);
    if (match) process.env[match[1]] = match[2].trim();
  }
}

const SCOPES = ['https://www.googleapis.com/auth/calendar'];
const PORT = 4000;
const REDIRECT_URI = `http://localhost:${PORT}/callback`;

async function main() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error(
      'Error: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set in .env.local\n' +
        'See .env.local.example for instructions.'
    );
    process.exit(1);
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  });

  console.log('\n━━━ Google Calendar Auth ━━━\n');
  console.log('Opening your browser to authorise access…');
  console.log('If it does not open automatically, visit:\n');
  console.log(' ', authUrl, '\n');

  // Try to open the browser automatically
  const { exec } = await import('child_process');
  const open =
    process.platform === 'darwin' ? 'open' :
    process.platform === 'win32' ? 'start' : 'xdg-open';
  exec(`${open} "${authUrl}"`);

  // Temporary local server to receive the OAuth callback
  await new Promise<void>((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);

      if (url.pathname !== '/callback') {
        res.end();
        return;
      }

      const code = url.searchParams.get('code');
      const error = url.searchParams.get('error');

      if (error || !code) {
        res.writeHead(400);
        res.end(`Auth failed: ${error ?? 'no code received'}`);
        server.close();
        reject(new Error(error ?? 'No authorisation code received'));
        return;
      }

      try {
        const { tokens } = await oauth2Client.getToken(code);

        if (!tokens.refresh_token) {
          res.writeHead(400);
          res.end('No refresh token received — see terminal for instructions.');
          server.close();
          console.error(
            '\nNo refresh token received. The app may already be authorised.\n' +
              'Go to https://myaccount.google.com/permissions, revoke access, then run this script again.'
          );
          reject(new Error('no_refresh_token'));
          return;
        }

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<html><body><h2>✓ Authorised! You can close this tab.</h2></body></html>');
        server.close();

        console.log('\n✓ Authorisation successful!\n');
        console.log('Add this to your .env.local:\n');
        console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}\n`);
        resolve();
      } catch (err) {
        res.writeHead(500);
        res.end('Token exchange failed — see terminal.');
        server.close();
        reject(err);
      }
    });

    server.listen(PORT, () => {
      console.log(`Waiting for Google to redirect to http://localhost:${PORT}/callback …\n`);
    });

    server.on('error', reject);
  });
}

main().catch((err) => {
  console.error('\nAuth failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
