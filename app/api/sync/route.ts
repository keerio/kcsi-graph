import { exec } from 'child_process';
import { NextResponse } from 'next/server';

export async function POST() {
  return new Promise<NextResponse>((resolve) => {
    exec('bash /app/sync_graph.sh', { timeout: 120_000 }, (error, stdout, stderr) => {
      const output = (stdout + stderr).trim();
      if (error) {
        resolve(NextResponse.json({ ok: false, error: error.message, output }, { status: 500 }));
      } else {
        resolve(NextResponse.json({ ok: true, output }));
      }
    });
  });
}
