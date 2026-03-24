import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

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

    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: {
        id: true,
        authorId: true,
        is_expired: true,
        is_crystallised: true,
        crystallise_threshold: true,
      },
    });

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Self-vote guard
    if (post.authorId === user.id) {
      return NextResponse.json({ error: 'Cannot crystallise your own post' }, { status: 400 });
    }

    if (post.is_crystallised) {
      return NextResponse.json({ error: 'Post already crystallised' }, { status: 400 });
    }

    const VOTE_COST = 0.1;

    await prisma.$transaction(async (tx) => {
      // Check wallet
      const wallet = await tx.wallet.findUnique({ where: { userId: user.id } });
      if (!wallet || wallet.balance < VOTE_COST) {
        throw new Error('Insufficient FUEL balance');
      }

      // Insert vote (unique constraint prevents duplicates)
      await tx.crystallisationVote.create({
        data: { postId, userId: user.id },
      });

      // Deduct 0.1 FUEL
      const newBalance = wallet.balance - VOTE_COST;
      await tx.wallet.update({ where: { userId: user.id }, data: { balance: newBalance } });
      await tx.tokenTransaction.create({
        data: {
          userId: user.id,
          walletId: wallet.id,
          type: 'spend',
          amount: -VOTE_COST,
          balanceAfter: newBalance,
          description: 'Crystallisation vote',
          postId,
        },
      });
    });

    // Count votes after transaction
    const voteCount = await prisma.crystallisationVote.count({ where: { postId } });

    let is_crystallised: boolean = post.is_crystallised;
    if (voteCount >= post.crystallise_threshold && !post.is_crystallised) {
      await prisma.post.update({
        where: { id: postId },
        data: { is_crystallised: true, is_expired: false },
      });
      is_crystallised = true;
    }

    return NextResponse.json({ voteCount, is_crystallised });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Internal server error';
    if (message.includes('Unique constraint')) {
      return NextResponse.json({ error: 'Already voted' }, { status: 400 });
    }
    if (message === 'Insufficient FUEL balance') {
      return NextResponse.json({ error: message }, { status: 402 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
