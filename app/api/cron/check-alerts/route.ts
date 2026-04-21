import { NextResponse } from 'next/server';
import { checkAndSendAlerts } from '@/lib/alerts';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await checkAndSendAlerts();
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Alert check failed';
    console.error('[cron] Alert check failed:', err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
