import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from '@/lib/auth';
import { processPresenceEvent } from '@/server/presence';

const presenceSchema = z.object({
  /** Duration of the long-press in milliseconds (max 60 s per event). */
  duration_ms: z.number().int().positive().max(60_000),
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
    const parsed = presenceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const result = await processPresenceEvent(
      user.id,
      params.id,
      parsed.data.duration_ms
    );

    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
