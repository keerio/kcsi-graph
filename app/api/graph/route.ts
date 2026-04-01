import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { fetchGraphData } from '@/lib/queries';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const dateFrom = searchParams.get('from') || undefined;
  const dateTo = searchParams.get('to') || undefined;

  try {
    const data = await fetchGraphData(getPool(), dateFrom, dateTo);
    return NextResponse.json(data);
  } catch (err) {
    console.error('Graph data error:', err);
    return NextResponse.json({ error: 'Failed to fetch graph data' }, { status: 500 });
  }
}
