import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from '@/lib/auth';
import { addComment } from '@/server/engagement';
import { maybeAwardEngagementBonus } from '@/server/engagement';

const commentSchema = z.object({
  postId: z.string().min(1),
  content: z.string().min(2).max(500),
  parentId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getServerSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = commentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const result = await addComment(user.id, parsed.data.postId, parsed.data.content, parsed.data.parentId);

    // Check engagement bonus asynchronously
    maybeAwardEngagementBonus(parsed.data.postId).catch(console.warn);

    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Internal server error';
    const status = message.includes('rate limit') ? 429 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
