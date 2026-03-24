import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { LIFETIME_DELTAS_MS } from '@/lib/lifetime';
import { creditWallet } from '@/server/wallet';

const echoSchema = z.object({
  comment: z.string().min(1, 'Echo comment is required'),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const postId = params.id;
    const body = await request.json();
    const parsed = echoSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, authorId: true, is_expired: true, is_crystallised: true },
    });

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    if (post.is_expired && !post.is_crystallised) {
      return NextResponse.json({ error: 'Post has expired' }, { status: 400 });
    }

    // Create echo record
    await prisma.echo.create({
      data: { postId, userId: user.id, comment: parsed.data.comment },
    });

    // Extend post lifetime by +30 minutes
    const deltaSeconds = Math.floor(LIFETIME_DELTAS_MS.echo / 1000);
    await prisma.$executeRaw`
      UPDATE "Post"
      SET "expiresAt" = "expiresAt" + (${deltaSeconds} * interval '1 second'),
          "is_expired" = false
      WHERE id = ${postId}
    `;

    // Award +0.50 FUEL to original post author
    if (post.authorId !== user.id) {
      await creditWallet(post.authorId, 0.5, 'Echo received', 'earn', postId).catch(
        (e) => console.warn('creditWallet echo failed:', e)
      );
    }

    const updated = await prisma.post.findUnique({
      where: { id: postId },
      select: { expiresAt: true },
    });

    return NextResponse.json({ expiresAt: updated?.expiresAt });
  } catch (e) {
    console.error('POST /api/posts/[id]/echo error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
