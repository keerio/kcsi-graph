import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { fetchPerson } from '@/lib/queries';

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
    const person = await fetchPerson(getPool(), numId);
    if (!person) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json(person);
  } catch (err) {
    console.error('Person fetch error:', err);
    return NextResponse.json({ error: 'Failed to fetch person' }, { status: 500 });
  }
}
