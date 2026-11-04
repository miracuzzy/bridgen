import { getTokens } from "@/lib/oneclick";
import { json, limited } from "@/lib/http";
import type { Token } from "@/lib/types";

export const revalidate = 300;

export async function GET(req: Request) {
  const rl = limited(req, "tokens", 60);
  if (rl) return rl;
  const r = await getTokens();
  if (!r.ok || !Array.isArray(r.data)) return json({ error: "Could not load supported tokens" }, 502);
  const tokens: Token[] = (r.data as Token[])
    .filter((t) => typeof t.assetId === "string" && typeof t.decimals === "number" && t.symbol && t.blockchain)
    .map(({ assetId, symbol, blockchain, decimals, price, priceUpdatedAt, contractAddress }) => ({ assetId, symbol, blockchain, decimals, price, priceUpdatedAt, contractAddress }));
  return json(tokens, 200, { "cache-control": "public, s-maxage=300, stale-while-revalidate=600" });
}
