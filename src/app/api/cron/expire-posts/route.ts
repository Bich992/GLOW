import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { encrypt, sha256Hash } from '@/lib/crypto';
import { logger } from '@/lib/logger';

const LOG_RETENTION_DAYS = 30;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();

    // Fetch posts that need expiring (not crystallised)
    const expiringPosts = await prisma.post.findMany({
      where: {
        expiresAt: { lt: now },
        is_expired: false,
        is_crystallised: false,
      },
      select: {
        id: true,
        authorId: true,
        content: true,
        imageUrl: true,
        audioUrl: true,
        videoUrl: true,
      },
    });

    if (expiringPosts.length === 0) {
      return NextResponse.json({ expired: 0 });
    }

    const deleteAfter = new Date(now.getTime() + LOG_RETENTION_DAYS * 24 * 3_600_000);

    // Write TemporaryPostLog entries and mark posts expired in batches
    let expired = 0;
    for (const post of expiringPosts) {
      try {
        const mediaUrl = post.imageUrl ?? post.audioUrl ?? post.videoUrl ?? '';
        const textEncrypted = process.env.LOG_ENCRYPTION_KEY
          ? encrypt(post.content)
          : Buffer.from(post.content).toString('base64');

        await prisma.$transaction([
          prisma.temporaryPostLog.upsert({
            where: { originalPostId: post.id },
            create: {
              originalPostId: post.id,
              authorId: post.authorId,
              textEncrypted,
              mediaUrlHash: sha256Hash(mediaUrl),
              reason: 'EXPIRED',
              deleteAfter,
            },
            update: {}, // no-op if already logged
          }),
          prisma.post.update({
            where: { id: post.id },
            data: { is_expired: true, status: 'expired' },
          }),
        ]);
        expired++;
      } catch (e) {
        logger.error('Failed to expire post', { postId: post.id, err: String(e) });
      }
    }

    logger.info('expire-posts cron completed', { expired });
    return NextResponse.json({ expired });
  } catch (e) {
    logger.error('expire-posts cron error', { err: String(e) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
