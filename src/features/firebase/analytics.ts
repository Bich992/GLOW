'use client';

import { getFirebaseApp, isFirebaseConfigured } from './client';

export type AnalyticsEvent =
  | 'post_create'
  | 'post_extend'
  | 'post_boost'
  | 'post_expire'
  | 'like_create'
  | 'comment_create'
  | 'wallet_spend'
  | 'wallet_earn';

export async function safeTrackEvent(
  eventName: AnalyticsEvent,
  params?: Record<string, string | number | boolean>
): Promise<void> {
  if (!isFirebaseConfigured()) return;

  try {
    const app = getFirebaseApp();
    if (!app) return;

    const { getAnalytics, logEvent, isSupported } = await import('firebase/analytics');
    const supported = await isSupported();
    if (!supported) return;

    const analytics = getAnalytics(app);
    logEvent(analytics, eventName, params);
  } catch (e) {
    // Analytics failures should never break the app
    console.warn('Analytics tracking failed:', e);
  }
}
