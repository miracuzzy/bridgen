import { NextResponse } from "next/server";

// Shared guards for API routes.
// Rate limiting is in-memory per server instance. On serverless each instance keeps its own
// counters and they reset on cold start, so this is best effort against casual abuse, not a hard quota.

type Bucket = { count: number; reset: number };
const buckets = new Map<string, Bucket>();

export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()): { ok: boolean; retryAfter: number } {
  if (buckets.size > 10_000) for (const [k, b] of buckets) if (b.reset <= now) buckets.delete(k);
  const b = buckets.get(key);
  if (!b || b.reset <= now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }
  b.count++;
  return b.count > limit ? { ok: false, retryAfter: Math.ceil((b.reset - now) / 1000) } : { ok: true, retryAfter: 0 };
}

export function _resetRateLimits() {
  buckets.clear();
}

export function clientIp(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  return (xff?.split(",")[0].trim() || headers.get("x-real-ip") || "unknown").slice(0, 64);
}

export function json(data: unknown, status = 200, extra: Record<string, string> = {}) {
  return NextResponse.json(data, { status, headers: { "cache-control": "no-store", ...extra } });
}

export function limited(req: Request, route: string, limit: number, windowMs = 60_000) {
  const r = rateLimit(`${route}:${clientIp(req.headers)}`, limit, windowMs);
  return r.ok ? null : json({ error: "Too many requests. Try again shortly." }, 429, { "retry-after": String(r.retryAfter) });
}

export const MAX_BODY_BYTES = 4096;

// Reads a JSON body with a size cap. Returns null for oversized, missing or malformed bodies.
export async function readJson(req: Request, max = MAX_BODY_BYTES): Promise<{ ok: true; value: unknown } | { ok: false; status: number; error: string }> {
  const len = Number(req.headers.get("content-length") ?? "0");
  if (len > max) return { ok: false, status: 413, error: "Request body too large" };
  if (!(req.headers.get("content-type") ?? "").includes("application/json")) return { ok: false, status: 415, error: "Expected JSON" };
  let text: string;
  try {
    text = await req.text();
  } catch {
    return { ok: false, status: 400, error: "Could not read request body" };
  }
  if (new TextEncoder().encode(text).length > max) return { ok: false, status: 413, error: "Request body too large" };
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false, status: 400, error: "Malformed JSON" };
  }
}

// Turns an upstream message into something safe to show: short, single line, no stack traces or URLs.
export function safeUpstreamMessage(m: unknown, fallback: string): string {
  if (typeof m !== "string") return fallback;
  const s = m.replace(/\s+/g, " ").trim();
  if (!s || s.length > 200 || /\bat\s+\S+\s*\(|https?:\/\/|stack|Error:|ECONN|\/[a-z]+\/[a-z]+\//i.test(s)) return fallback;
  return s;
}

// Upstream status to a status we expose. Auth and server failures become 502 so internals are not mirrored.
export function exposedStatus(s: number): number {
  if (s === 400 || s === 404 || s === 429 || s === 504) return s;
  return 502;
}

// 1Click deposit addresses: EVM hex, NEAR implicit hex, base58 (Solana, BTC legacy, Tron), bech32 BTC, and similar.
export const DEPOSIT_ADDRESS = /^[A-Za-z0-9]{20,128}$|^0x[0-9a-fA-F]{40}$/;
export const DEPOSIT_MEMO = /^[A-Za-z0-9_-]{1,64}$/;
