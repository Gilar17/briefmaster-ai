export const RATE_LIMIT_MAX_REQUESTS = 5;
export const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
export const RATE_LIMIT_USER_MESSAGE =
  "Слишком много запросов. Подождите несколько минут и попробуйте снова.";

const UNKNOWN_CLIENT_KEY = "unknown";
const MAX_STORED_KEYS = 500;

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const globalStore = globalThis as typeof globalThis & {
  __briefmasterRateLimitBuckets?: Map<string, RateLimitBucket>;
};

const buckets =
  globalStore.__briefmasterRateLimitBuckets ??
  new Map<string, RateLimitBucket>();

globalStore.__briefmasterRateLimitBuckets = buckets;

/**
 * Best-effort in-memory limit for the current Node.js process.
 * On Vercel this is not a global guarantee: instances restart and run in parallel.
 */
export function consumeRateLimit(
  key: string,
  now: number = Date.now(),
): { allowed: boolean } {
  pruneExpiredBuckets(now);

  const existing = buckets.get(key);

  if (!existing || now >= existing.resetAt) {
    buckets.set(key, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
    return { allowed: true };
  }

  if (existing.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false };
  }

  existing.count += 1;
  return { allowed: true };
}

export function getClientIpFromHeaders(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");

  if (forwarded) {
    const candidate = forwarded.split(",")[0]?.trim();

    if (isUsableIp(candidate)) {
      return candidate;
    }
  }

  const realIp = headers.get("x-real-ip")?.trim();

  if (isUsableIp(realIp)) {
    return realIp;
  }

  return UNKNOWN_CLIENT_KEY;
}

function pruneExpiredBuckets(now: number): void {
  if (buckets.size < MAX_STORED_KEYS) {
    return;
  }

  for (const [key, bucket] of buckets) {
    if (now >= bucket.resetAt) {
      buckets.delete(key);
    }
  }
}

function isUsableIp(value: string | undefined): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= 64 &&
    !/\s/.test(value)
  );
}
