/**
 * Structured logger — thin wrapper over console in dev, JSON lines in production.
 * Drop-in replacement for console.log/warn/error in production paths.
 */

type LogLevel = "info" | "warn" | "error" | "debug";

interface LogEntry {
  ts: string;
  level: LogLevel;
  msg: string;
  [key: string]: unknown;
}

function log(level: LogLevel, msg: string, meta?: Record<string, unknown>): void {
  const entry: LogEntry = {
    ts: new Date().toISOString(),
    level,
    msg,
    ...meta,
  };

  if (process.env.NODE_ENV === "production") {
    // NDJSON line for log aggregators
    process.stdout.write(JSON.stringify(entry) + "\n");
  } else {
    const prefix = `[${entry.level.toUpperCase()}] ${entry.ts}`;
    if (level === "error") {
      console.error(prefix, msg, meta ?? "");
    } else if (level === "warn") {
      console.warn(prefix, msg, meta ?? "");
    } else {
      console.info(prefix, msg, meta ?? "");
    }
  }
}

export const logger = {
  info: (msg: string, meta?: Record<string, unknown>) => log("info", msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => log("warn", msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => log("error", msg, meta),
  debug: (msg: string, meta?: Record<string, unknown>) => {
    if (process.env.NODE_ENV !== "production") log("debug", msg, meta);
  },
};
