import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from '@/lib/auth';
import { getFeed } from '@/server/feed';
import { publishPost } from '@/server/posts';

const createPostSchema = z.object({
  content: z.string().min(1).max(300, 'Post text must be 300 characters or less'),
  imageUrl: z.string().url().optional(),
  audioUrl: z.string().url().optional(),
  videoUrl: z.string().url().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await getServerSession();
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') ?? '20');
    const cursor = searchParams.get('cursor') ?? undefined;
    const filter = (searchParams.get('filter') ?? 'all') as 'all' | 'following';

    const { posts, nextCursor } = await getFeed({
      userId: user?.id,
      limit: Math.min(limit, 50),
      cursor,
      filter,
    });

    return NextResponse.json({ posts, nextCursor });
  } catch (e) {
    console.error('GET /api/posts error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getServerSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createPostSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { content, imageUrl, audioUrl, videoUrl } = parsed.data;

    // Media is required
    if (!imageUrl && !audioUrl && !videoUrl) {
      return NextResponse.json(
        { error: 'Media is required (image, audio, or video)' },
        { status: 400 }
      );
    }

    const localHourHeader = request.headers.get('X-Local-Hour');
    const localHour = localHourHeader !== null ? parseInt(localHourHeader, 10) : undefined;

    const result = await publishPost(user.id, content, imageUrl, audioUrl, videoUrl, localHour);

    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Internal server error';
    const status = message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
