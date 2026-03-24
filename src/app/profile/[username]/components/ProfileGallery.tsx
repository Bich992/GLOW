'use client';

import { useState, useEffect } from 'react';
import { OndeTab } from './OndeTab';
import { CristalliTab } from './CristalliTab';

interface LivePost {
  id: string;
  content: string;
  expiresAt: string | null;
  bornAt: string;
  likeCount: number;
  commentCount: number;
}

interface CrystallisedPost {
  id: string;
  content: string;
  imageUrl: string | null;
  audioUrl: string | null;
  videoUrl: string | null;
  createdAt: string;
  voteCount: number;
  voters: { username: string; avatarUrl: string | null }[];
}

type ActiveTab = 'onde' | 'cristalli';
const STORAGE_KEY = 'profile_active_tab';

interface ProfileGalleryProps {
  username: string;
  userId: string;
  livePosts: LivePost[];
  crystalPosts: CrystallisedPost[];
}

export function ProfileGallery({ username, userId, livePosts, crystalPosts }: ProfileGalleryProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('onde');

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'onde' || saved === 'cristalli') {
      setActiveTab(saved);
    }
  }, []);

  function switchTab(tab: ActiveTab) {
    setActiveTab(tab);
    localStorage.setItem(STORAGE_KEY, tab);
  }

  return (
    <div className="space-y-4">
      {/* Tab switcher */}
      <div className="flex border-b border-border">
        {(['onde', 'cristalli'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => switchTab(tab)}
            className={[
              'flex-1 pb-2 text-sm font-medium capitalize transition-colors',
              activeTab === tab
                ? 'border-b-2 border-primary text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            ].join(' ')}
          >
            {tab === 'onde' ? '🌊 Onde' : '💎 Cristalli'}
            {tab === 'onde' && livePosts.length > 0 && (
              <span className="ml-1.5 rounded-full bg-primary/20 px-1.5 py-0.5 text-[10px] text-primary">
                {livePosts.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'onde' ? (
        <OndeTab username={username} userId={userId} initialPosts={livePosts} />
      ) : (
        <CristalliTab posts={crystalPosts} />
      )}
    </div>
  );
}
