import { NextRequest, NextResponse } from "next/server";
import { getTokens, postQuote } from "@/lib/oneclick";
import { buildQuoteRequest, parseQuoteResponse, type SwapForm } from "@/lib/quote-input";
import type { Token } from "@/lib/types";

// POST { form: SwapForm, dry: boolean }
// The request is rebuilt and validated here against the live token list, so the browser cannot send arbitrary bodies upstream.
export async function POST(req: NextRequest) {
  const b = (await req.json().catch(() => null)) as { form?: SwapForm; dry?: boolean } | null;
  if (!b?.form) return NextResponse.json({ error: "Missing swap details" }, { status: 400 });
  const t = await getTokens();
  if (!t.ok || !Array.isArray(t.data)) return NextResponse.json({ error: "Could not load supported tokens" }, { status: 502 });
  const built = buildQuoteRequest({ ...b.form, slippageBps: Number(b.form.slippageBps) }, t.data as Token[], b.dry !== false);
  if (!built.ok) return NextResponse.json({ error: built.error }, { status: 400 });
  const r = await postQuote(built.body);
  if (!r.ok) {
    const msg = (r.data as { message?: string } | null)?.message;
    return NextResponse.json({ error: msg || `Quote unavailable (${r.status})` }, { status: r.status === 401 ? 502 : r.status });
  }
  const parsed = parseQuoteResponse(r.data);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 502 });
  return NextResponse.json(parsed.value);
}
