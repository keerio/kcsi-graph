import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { fetchEvent } from '@/lib/queries';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const numId = parseInt(id);
  if (isNaN(numId)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }

  try {
    const event = await fetchEvent(getPool(), numId);
    if (!event) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json(event);
  } catch (err) {
    console.error('Event fetch error:', err);
    return NextResponse.json({ error: 'Failed to fetch event' }, { status: 500 });
  }
}
