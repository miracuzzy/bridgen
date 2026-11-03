import "server-only";
import type { QuoteRequestBody } from "./types";

// Server-side only. The API key never reaches the browser.
export const ONECLICK_BASE = "https://1click.chaindefuser.com";

function headers(): Record<string, string> {
  const h: Record<string, string> = { "content-type": "application/json" };
  const key = process.env.ONECLICK_API_KEY;
  if (key) h.authorization = `Bearer ${key}`;
  return h;
}

async function call(path: string, init: RequestInit = {}, timeoutMs = 15000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(`${ONECLICK_BASE}${path}`, { ...init, headers: headers(), signal: ctrl.signal, cache: "no-store" });
    const data = await r.json().catch(() => null);
    return { ok: r.ok, status: r.status, data };
  } catch (e) {
    const aborted = (e as Error).name === "AbortError";
    return { ok: false, status: aborted ? 504 : 502, data: { message: aborted ? "Quote service timed out" : "Could not reach quote service" } };
  } finally {
    clearTimeout(t);
  }
}

export const getTokens = () => call("/v0/tokens");
export const postQuote = (body: QuoteRequestBody) => call("/v0/quote", { method: "POST", body: JSON.stringify(body) }, 25000);
export const getStatus = (depositAddress: string, memo?: string) =>
  call(`/v0/status?depositAddress=${encodeURIComponent(depositAddress)}${memo ? `&depositMemo=${encodeURIComponent(memo)}` : ""}`);
