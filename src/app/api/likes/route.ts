import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from '@/lib/auth';
import { addLike } from '@/server/engagement';
import { maybeAwardEngagementBonus } from '@/server/engagement';

const likeSchema = z.object({
  postId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getServerSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = likeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const result = await addLike(user.id, parsed.data.postId);

    // Check engagement bonus asynchronously
    if (result.liked) {
      maybeAwardEngagementBonus(parsed.data.postId).catch(console.warn);
    }

    return NextResponse.json(result);
  } catch (e) {
    console.error('POST /api/likes error:', e);
    const message = e instanceof Error ? e.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
