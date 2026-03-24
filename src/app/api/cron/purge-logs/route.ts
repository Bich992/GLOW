import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

// Schedule: 0 3 * * * (daily at 3AM)
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await prisma.temporaryPostLog.deleteMany({
      where: { deleteAfter: { lt: new Date() } },
    });

    logger.info('purge-logs cron completed', { deleted: result.count });
    return NextResponse.json({ deleted: result.count });
  } catch (e) {
    logger.error('purge-logs cron error', { err: String(e) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
