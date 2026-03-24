import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { debitWallet, creditWallet } from '@/server/wallet';

const tipSchema = z.object({
  amount: z.number().min(0.1).max(10),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerSession();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const parsed = tipSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

    const { amount } = parsed.data;

    const comment = await prisma.comment.findUnique({
      where: { id: params.id },
      select: { userId: true, postId: true },
    });
    if (!comment) return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    if (comment.userId === user.id) return NextResponse.json({ error: 'Cannot tip your own comment' }, { status: 400 });

    // Debit tipper
    await debitWallet(user.id, amount, `Tip to comment author`, comment.postId);

    // Credit author
    await creditWallet(
      comment.userId,
      amount,
      `Received tip for comment`,
      'earn',
      comment.postId,
      true
    );

    // Notifica l'autore
    await prisma.notification.create({
      data: {
        userId: comment.userId,
        type: 'system',
        title: 'Commento premiato!',
        body: `${user.displayName} ti ha inviato ${amount} TIMT per il tuo commento`,
        actorId: user.id,
        postId: comment.postId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Internal server error';
    const status = message.includes('Insufficient') ? 402 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
