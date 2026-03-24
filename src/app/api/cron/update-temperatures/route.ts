import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { subDays, subHours } from 'date-fns';
import { computeTemperature, getTempState } from '@/lib/temperature';
import { logger } from '@/lib/logger';

const BATCH_SIZE = 100;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const sevenDaysAgo = subDays(new Date(), 7);
    const fortyEightHoursAgo = subHours(new Date(), 48);

    const totalUsers = await prisma.user.count({
      where: { last_active_at: { gte: sevenDaysAgo } },
    });

    let processed = 0;
    let offset = 0;

    while (offset < totalUsers) {
      const users = await prisma.user.findMany({
        where: { last_active_at: { gte: sevenDaysAgo } },
        select: { id: true, last_active_at: true, temperature: true },
        skip: offset,
        take: BATCH_SIZE,
      });

      await Promise.all(
        users.map(async (user) => {
          const [postsCount, likeCount, commentCount, echoCount, fuelResult] = await Promise.all([
            prisma.post.count({
              where: { authorId: user.id, born_at: { gte: fortyEightHoursAgo } },
            }),
            prisma.like.count({
              where: { userId: user.id, createdAt: { gte: fortyEightHoursAgo } },
            }),
            prisma.comment.count({
              where: { userId: user.id, createdAt: { gte: fortyEightHoursAgo } },
            }),
            prisma.echo.count({
              where: { userId: user.id, createdAt: { gte: fortyEightHoursAgo } },
            }),
            prisma.tokenTransaction.aggregate({
              where: {
                userId: user.id,
                type: { in: ['earn'] },
                description: { contains: 'received' },
                createdAt: { gte: fortyEightHoursAgo },
              },
              _sum: { amount: true },
            }),
          ]);

          const interactionsSent = likeCount + commentCount + echoCount;
          const fuelReceived = fuelResult._sum.amount ?? 0;

          const temperature = computeTemperature({
            postsLast48h: postsCount,
            interactionsSent,
            fuelReceivedLast48h: fuelReceived,
            lastActiveAt: user.last_active_at,
          });

          await prisma.user.update({
            where: { id: user.id },
            data: {
              temperature,
              temp_state: getTempState(temperature),
            },
          });
        })
      );

      processed += users.length;
      offset += BATCH_SIZE;
    }

    logger.info('update-temperatures cron completed', { processed });
    return NextResponse.json({ processed });
  } catch (e) {
    logger.error('update-temperatures cron error', { err: String(e) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
