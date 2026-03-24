'use client';

import { getFirebaseApp, isFirebaseConfigured } from './client';

export async function initAppCheck(): Promise<void> {
  if (!isFirebaseConfigured()) return;

  try {
    const app = getFirebaseApp();
    if (!app) return;

    const { initializeAppCheck, ReCaptchaEnterpriseProvider, CustomProvider } = await import(
      'firebase/app-check'
    );

    const isDev = process.env.NODE_ENV === 'development';

    if (isDev) {
      // Use debug token in development
      const debugToken = process.env.NEXT_PUBLIC_APP_CHECK_DEBUG_TOKEN;
      if (debugToken) {
        // @ts-expect-error - debug token is a special global
        self.FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken;
      } else {
        // Auto-generate debug token (logged to console)
        // @ts-expect-error - debug token is a special global
        self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
      }

      initializeAppCheck(app, {
        provider: new CustomProvider({
          getToken: async () => ({
            token: debugToken || 'debug-token',
            expireTimeMillis: Date.now() + 3600000,
          }),
        }),
        isTokenAutoRefreshEnabled: true,
      });
    } else {
      const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
      if (!siteKey) {
        console.warn('App Check: ReCaptcha site key not configured');
        return;
      }

      initializeAppCheck(app, {
        provider: new ReCaptchaEnterpriseProvider(siteKey),
        isTokenAutoRefreshEnabled: true,
      });
    }
  } catch (e) {
    console.warn('App Check initialization failed:', e);
  }
}
