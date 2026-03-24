import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { extendPost } from '@/server/posts';

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await extendPost(user.id, params.id);
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Internal server error';
    const status = message === 'Unauthorized' ? 401 : message.startsWith('Maximum') || message.includes('cap') ? 429 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
