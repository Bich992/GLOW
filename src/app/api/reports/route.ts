import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
const REPORT_REASONS = ['spam', 'hate_speech', 'harassment', 'misinformation', 'explicit_content', 'other'] as const;

const reportSchema = z.object({
  postId: z.string().optional(),
  commentId: z.string().optional(),
  reason: z.enum(REPORT_REASONS),
  description: z.string().max(500).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getServerSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = reportSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { postId, commentId, reason, description } = parsed.data;

    if (!postId && !commentId) {
      return NextResponse.json({ error: 'Must provide postId or commentId' }, { status: 400 });
    }

    const report = await prisma.report.create({
      data: {
        reporterId: user.id,
        postId,
        commentId,
        reason,
        description,
      },
    });

    return NextResponse.json({ id: report.id }, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
