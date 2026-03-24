'use client';

import { TempBadge } from '@/components/ui/TempBadge';
import type { TempState } from '@/lib/temperature';

interface StatsRow {
  totalLifetimeSeconds: number;
  recordSeconds: number;
  generosityFuel: number;
  crystals: number;
  posts7d: number;
  livePostCount: number;
}

interface ProfileHeaderProps {
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  tempState: TempState;
  temperature: number;
  stats: StatsRow;
  isOwnProfile: boolean;
  isFollowing: boolean;
  onFollowToggle: () => void;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function ProfileHeader({
  username,
  displayName,
  avatarUrl,
  bio,
  tempState,
  temperature,
  stats,
  isOwnProfile,
  isFollowing,
  onFollowToggle,
}: ProfileHeaderProps) {
  const postsPerWeek = stats.posts7d;

  return (
    <div className="space-y-4">
      {/* Avatar + basic info */}
      <div className="flex items-start gap-4">
        <div className={`relative rounded-full border-2 ${
          tempState !== 'COLD' ? 'temp-glowing border-cyan-400' : 'border-border'
        }`}>
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-2xl font-bold">
              {displayName[0]?.toUpperCase()}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-bold">{displayName}</h1>
            <TempBadge tempState={tempState} temperature={temperature} />
          </div>
          <p className="text-sm text-muted-foreground">@{username}</p>
          {bio && <p className="mt-1 text-sm">{bio}</p>}
        </div>

        {!isOwnProfile && (
          <button
            onClick={onFollowToggle}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              isFollowing
                ? 'border border-border bg-transparent text-foreground hover:bg-destructive/10 hover:text-destructive'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            }`}
          >
            {isFollowing ? 'Segui già' : 'Segui'}
          </button>
        )}
      </div>

      {/* Stats chip row — horizontally scrollable */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[
          { icon: '⏱', label: formatDuration(stats.totalLifetimeSeconds) },
          { icon: '🏆', label: `Record: ${formatDuration(stats.recordSeconds)}` },
          { icon: '💰', label: `Generosità: ${stats.generosityFuel.toFixed(0)} FUEL` },
          { icon: '💎', label: `Cristalli: ${stats.crystals}` },
          { icon: '📊', label: `Ritmo: ${postsPerWeek}/week` },
          { icon: '🔥', label: `Live: ${stats.livePostCount}` },
        ].map(({ icon, label }) => (
          <span
            key={label}
            className="shrink-0 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs text-muted-foreground"
          >
            {icon} {label}
          </span>
        ))}
      </div>
    </div>
  );
}
