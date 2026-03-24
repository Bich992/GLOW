import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from '@/lib/auth';
import { boostPost } from '@/server/posts';

const boostSchema = z.object({
  amount: z.number().positive().min(0.5).max(20),
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

    const body = await request.json();
    const parsed = boostSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const result = await boostPost(user.id, params.id, parsed.data.amount);
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Internal server error';
    const status =
      message === 'Unauthorized'
        ? 401
        : message === 'Insufficient balance'
          ? 402
          : message.includes('cap')
            ? 429
            : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
