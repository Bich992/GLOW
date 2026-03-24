'use client';

import { getFirebaseApp, isFirebaseConfigured } from './client';
import { REMOTE_CONFIG_DEFAULTS, RemoteConfigKey } from '@/lib/config';

const remoteConfigCache: Record<string, string | number | boolean> = {};
let lastFetchTime = 0;
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

export async function getRemoteConfigValueOrDefault<K extends RemoteConfigKey>(
  key: K
): Promise<(typeof REMOTE_CONFIG_DEFAULTS)[K]> {
  const defaultValue = REMOTE_CONFIG_DEFAULTS[key];

  if (!isFirebaseConfigured()) {
    return defaultValue;
  }

  try {
    const now = Date.now();
    if (now - lastFetchTime < CACHE_DURATION_MS && key in remoteConfigCache) {
      return remoteConfigCache[key] as (typeof REMOTE_CONFIG_DEFAULTS)[K];
    }

    const app = getFirebaseApp();
    if (!app) return defaultValue;

    const { getRemoteConfig, fetchAndActivate, getValue } = await import('firebase/remote-config');
    const remoteConfig = getRemoteConfig(app);
    remoteConfig.settings.minimumFetchIntervalMillis = CACHE_DURATION_MS;

    // Set defaults
    remoteConfig.defaultConfig = Object.fromEntries(
      Object.entries(REMOTE_CONFIG_DEFAULTS).map(([k, v]) => [k, v.toString()])
    );

    await fetchAndActivate(remoteConfig);
    lastFetchTime = now;

    const value = getValue(remoteConfig, key);

    if (typeof defaultValue === 'number') {
      const numVal = Number(value.asString());
      remoteConfigCache[key] = numVal;
      return numVal as (typeof REMOTE_CONFIG_DEFAULTS)[K];
    } else if (typeof defaultValue === 'boolean') {
      const boolVal = value.asBoolean();
      remoteConfigCache[key] = boolVal;
      return boolVal as unknown as (typeof REMOTE_CONFIG_DEFAULTS)[K];
    } else {
      const strVal = value.asString();
      remoteConfigCache[key] = strVal;
      return strVal as unknown as (typeof REMOTE_CONFIG_DEFAULTS)[K];
    }
  } catch (e) {
    console.warn('Remote Config fetch failed, using default:', e);
    return defaultValue;
  }
}
