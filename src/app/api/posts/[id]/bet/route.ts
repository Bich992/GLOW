import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from '@/lib/auth';
import { placeFuelBet } from '@/server/scouts';

const betSchema = z.object({
  /** FUEL amount to stake. Min 1, max 100 per bet. */
  fuel_amount: z.number().positive().min(1).max(100),
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
    const parsed = betSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const result = await placeFuelBet(user.id, params.id, parsed.data.fuel_amount);
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Internal server error';
    const status =
      message === 'Unauthorized'
        ? 401
        : message === 'Insufficient balance'
          ? 402
          : message.includes('revealed') || message.includes('expired')
            ? 409
            : message.includes('own post') || message.includes('Already placed')
              ? 403
              : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
