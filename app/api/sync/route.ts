import { NextResponse } from 'next/server';

export async function POST() {
  try {
    // Delegate to sync-runner sidecar (has docker access + GNU tools)
    const res = await fetch('http://127.0.0.1:3201', {
      method: 'POST',
      signal: AbortSignal.timeout(180_000),
    });
    const body = await res.json();
    return NextResponse.json(body, { status: res.status });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
