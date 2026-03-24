import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getServerSession } from '@/lib/auth';

const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(50).optional(),
  bio: z.string().max(200).optional(),
  website: z.string().url().optional().or(z.literal('')),
  location: z.string().max(100).optional(),
  avatarUrl: z.string().url().optional().or(z.literal('')),
  headerUrl: z.string().url().optional().or(z.literal('')),
});

export async function PATCH(request: NextRequest) {
  try {
    const user = await getServerSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = updateProfileSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request', details: parsed.error.issues }, { status: 400 });
    }

    const { displayName, bio, website, location, avatarUrl, headerUrl } = parsed.data;

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          ...(displayName ? { displayName } : {}),
          ...(bio !== undefined ? { bio } : {}),
          ...(avatarUrl !== undefined ? { avatarUrl: avatarUrl || null } : {}),
        },
      });

      await tx.profile.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          ...(website !== undefined ? { website: website || null } : {}),
          ...(location !== undefined ? { location } : {}),
          ...(headerUrl !== undefined ? { headerUrl: headerUrl || null } : {}),
        },
        update: {
          ...(website !== undefined ? { website: website || null } : {}),
          ...(location !== undefined ? { location } : {}),
          ...(headerUrl !== undefined ? { headerUrl: headerUrl || null } : {}),
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('PATCH /api/profile error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
