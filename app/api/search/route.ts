import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { searchEntities } from '@/lib/queries';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') || '';
  if (q.length < 2) {
    return NextResponse.json([]);
  }

  try {
    const results = await searchEntities(getPool(), q);
    return NextResponse.json(results);
  } catch (err) {
    console.error('Search error:', err);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
