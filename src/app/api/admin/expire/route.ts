import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { expirePostsJob } from '@/server/posts';

export async function POST(request: NextRequest) {
  try {
    // In production, this should check for admin role or a secret key
    const user = await getServerSession();

    // Allow admin users or provide a secret key for cron jobs
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    const isAuthorized =
      (cronSecret && authHeader === `Bearer ${cronSecret}`) ||
      (user?.isAdmin ?? false) ||
      process.env.NODE_ENV === 'development';

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await expirePostsJob();
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
