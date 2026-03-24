import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await prisma.post.updateMany({
      where: {
        expiresAt: { lt: new Date() },
        is_expired: false,
        is_crystallised: false,
      },
      data: { is_expired: true, status: 'expired' },
    });

    return NextResponse.json({ expired: result.count });
  } catch (e) {
    console.error('expire-posts cron error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
