// Remote config defaults - these are overridden by Firebase Remote Config when available
export const REMOTE_CONFIG_DEFAULTS = {
  TIMELY_THETA_ER60: 10,
  BOOST_CAP: 20,
  BOOST_MIN_CONTRIB: 0.5,
  BOOST_WINDOW_MIN: 120,
  EXT_BASE_SEC: 3600,
  EXT_DECAY: 0.8,
  EXT_MIN_SEC: 300,
  EXT_MAX_PER_USER_DAY: 5,
  POST_DAILY_CAP_SEC: 43200, // 12 hours
  FAUCET_DAILY_CAP: 3,
  POST_INITIAL_DURATION_SEC: 21600, // 6 hours
  POST_COST_TIMT: 1,
  LIKE_EARN_TIMT: 0.05,
  COMMENT_EARN_TIMT: 0.2,
  COMMENT_MIN_LENGTH: 20,
  ER60_BONUS_TIMT: 0.5,
  ER60_BONUS_INTERVAL_HOURS: 6,
  BOOST_PRIORITY_PER_TIMT: 0.2,
  BOOST_PRIORITY_DURATION_MIN: 20,
  BOOST_MAX_PRIORITY_PCT: 2.0, // 200%
} as const;

export type RemoteConfigKey = keyof typeof REMOTE_CONFIG_DEFAULTS;

// Get a remote config value with fallback
export function getConfigValue<K extends RemoteConfigKey>(key: K): (typeof REMOTE_CONFIG_DEFAULTS)[K] {
  return REMOTE_CONFIG_DEFAULTS[key];
}
