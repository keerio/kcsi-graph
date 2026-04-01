import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { fetchProject } from '@/lib/queries';

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
    const project = await fetchProject(getPool(), numId);
    if (!project) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json(project);
  } catch (err) {
    console.error('Project fetch error:', err);
    return NextResponse.json({ error: 'Failed to fetch project' }, { status: 500 });
  }
}
