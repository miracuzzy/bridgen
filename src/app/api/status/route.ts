import { getStatus } from "@/lib/oneclick";
import { DEPOSIT_ADDRESS, DEPOSIT_MEMO, exposedStatus, json, limited, safeUpstreamMessage } from "@/lib/http";

export async function GET(req: Request) {
  const rl = limited(req, "status", 120);
  if (rl) return rl;
  const sp = new URL(req.url).searchParams;
  const addr = sp.get("depositAddress")?.trim() ?? "";
  const memo = sp.get("depositMemo")?.trim() || undefined;
  if (!DEPOSIT_ADDRESS.test(addr)) return json({ error: "Enter a valid deposit address" }, 400);
  if (memo !== undefined && !DEPOSIT_MEMO.test(memo)) return json({ error: "Invalid deposit memo" }, 400);
  const r = await getStatus(addr, memo);
  if (!r.ok) {
    const s = exposedStatus(r.status);
    const fb = s === 404 ? "Deposit address not found" : "Status unavailable";
    return json({ error: s === 404 || s === 400 ? safeUpstreamMessage((r.data as { message?: unknown } | null)?.message, fb) : fb }, s);
  }
  return json(r.data);
}
