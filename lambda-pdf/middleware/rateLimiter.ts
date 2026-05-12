// In-memory rate limiter: 5 requests per IP per 15-minute window.
// State lives in Lambda process memory — resets on cold start (acceptable for Release 1).

interface Window {
  count: number;
  windowStart: number;
}

const store = new Map<string, Window>();

const MAX = Number(process.env.RATE_LIMIT_MAX ?? 5);
const WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW ?? 900) * 1000;

export interface RateLimitResult {
  allowed: boolean;
  retry_after_seconds: number;
}

export function checkRateLimit(ip: string): RateLimitResult {
  const now = Date.now();
  const entry = store.get(ip);

  if (!entry || now - entry.windowStart > WINDOW_MS) {
    store.set(ip, { count: 1, windowStart: now });
    return { allowed: true, retry_after_seconds: 0 };
  }

  if (entry.count >= MAX) {
    const retry_after_seconds = Math.ceil(
      (WINDOW_MS - (now - entry.windowStart)) / 1000
    );
    return { allowed: false, retry_after_seconds };
  }

  entry.count += 1;
  return { allowed: true, retry_after_seconds: 0 };
}

// Periodic cleanup to avoid unbounded map growth on warm Lambdas.
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of store.entries()) {
    if (now - entry.windowStart > WINDOW_MS * 2) {
      store.delete(ip);
    }
  }
}, WINDOW_MS);
