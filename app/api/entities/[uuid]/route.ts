import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { fetchEntity } from '@/lib/queries';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ uuid: string }> }
) {
  const { uuid } = await params;
  if (!uuid || uuid.length < 10) {
    return NextResponse.json({ error: 'Invalid UUID' }, { status: 400 });
  }

  try {
    const entity = await fetchEntity(getPool(), uuid);
    if (!entity) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json(entity);
  } catch (err) {
    console.error('Entity fetch error:', err);
    return NextResponse.json({ error: 'Failed to fetch entity' }, { status: 500 });
  }
}
