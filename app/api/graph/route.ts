import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { fetchGraphData } from '@/lib/queries';

export async function GET() {
  try {
    const data = await fetchGraphData(getPool());
    return NextResponse.json(data);
  } catch (err) {
    console.error('Graph data error:', err);
    return NextResponse.json({ error: 'Failed to fetch graph data' }, { status: 500 });
  }
}
