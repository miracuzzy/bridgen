import { getTokens, postQuote } from "@/lib/oneclick";
import { buildQuoteRequest, parseForm, parseQuoteResponse } from "@/lib/quote-input";
import { exposedStatus, json, limited, readJson, safeUpstreamMessage } from "@/lib/http";
import type { Token } from "@/lib/types";

// POST { form: SwapForm, dry: boolean }
// The request is rebuilt and validated here against the live token list, so the browser cannot send arbitrary bodies upstream.
export async function POST(req: Request) {
  const rl = limited(req, "quote", 20);
  if (rl) return rl;
  const body = await readJson(req);
  if (!body.ok) return json({ error: body.error }, body.status);
  const b = body.value as { form?: unknown; dry?: unknown } | null;
  const form = parseForm(b?.form);
  if (!form) return json({ error: "Missing or invalid swap details" }, 400);
  if (b?.dry !== undefined && typeof b.dry !== "boolean") return json({ error: "Invalid dry flag" }, 400);
  const t = await getTokens();
  if (!t.ok || !Array.isArray(t.data)) return json({ error: "Could not load supported tokens" }, 502);
  const built = buildQuoteRequest(form, t.data as Token[], b?.dry !== false);
  if (!built.ok) return json({ error: built.error }, 400);
  const r = await postQuote(built.body);
  if (!r.ok) {
    const s = exposedStatus(r.status);
    const fb = `Quote unavailable (${s})`;
    const msg = s === 400 || s === 404 || s === 429 ? safeUpstreamMessage((r.data as { message?: unknown } | null)?.message, fb) : fb;
    return json({ error: msg }, s);
  }
  const parsed = parseQuoteResponse(r.data);
  if (!parsed.ok) return json({ error: safeUpstreamMessage(parsed.error, "Unexpected quote response") }, 502);
  return json(parsed.value);
}
