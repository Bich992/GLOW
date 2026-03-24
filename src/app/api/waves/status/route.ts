import { NextRequest, NextResponse } from 'next/server';
import { WAVES, getActiveWave, minutesToNextWave } from '@/lib/waves';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  const localHourHeader = request.headers.get('X-Local-Hour');
  const now = new Date();
  const localHour = localHourHeader !== null ? parseInt(localHourHeader, 10) : now.getUTCHours();
  const localMinute = now.getUTCMinutes();

  const activeWave = getActiveWave(localHour);

  // Find next wave
  let nextWave = WAVES.find((w) => w.start > localHour) ?? WAVES[0];

  // Compute endsAt / startsAt as UTC dates
  let activeWaveInfo = null;
  if (activeWave) {
    const endsAt = new Date(now);
    endsAt.setUTCHours(activeWave.end, 0, 0, 0);
    if (endsAt <= now) endsAt.setUTCDate(endsAt.getUTCDate() + 1);
    activeWaveInfo = {
      id: activeWave.id,
      label: activeWave.label,
      endsAt: endsAt.toISOString(),
    };

    // When active, next wave is the one after
    const idx = WAVES.findIndex((w) => w.id === activeWave.id);
    nextWave = WAVES[(idx + 1) % WAVES.length];
  }

  const startsAt = new Date(now);
  startsAt.setUTCHours(nextWave.start, 0, 0, 0);
  if (startsAt <= now) startsAt.setUTCDate(startsAt.getUTCDate() + 1);

  const nextWaveInfo = {
    id: nextWave.id,
    label: nextWave.label,
    startsAt: startsAt.toISOString(),
    minutesUntil: minutesToNextWave(localHour, localMinute),
  };

  // Best of last wave: top 3 posts by expires_at DESC that have expired
  const bestOfLastWave = await prisma.post.findMany({
    where: {
      is_expired: true,
      is_crystallised: false,
      hiddenByMod: false,
    },
    orderBy: { expiresAt: 'desc' },
    take: 3,
    select: {
      id: true,
      content: true,
      expiresAt: true,
      born_at: true,
      author: {
        select: { username: true, displayName: true, avatarUrl: true },
      },
      stats: {
        select: { likeCount: true, commentCount: true },
      },
    },
  });

  return NextResponse.json({
    activeWave: activeWaveInfo,
    nextWave: nextWaveInfo,
    bestOfLastWave,
  });
}
