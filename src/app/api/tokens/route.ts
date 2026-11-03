import { NextResponse } from "next/server";
import { getTokens } from "@/lib/oneclick";
import type { Token } from "@/lib/types";

export const revalidate = 300;

export async function GET() {
  const r = await getTokens();
  if (!r.ok || !Array.isArray(r.data)) return NextResponse.json({ error: "Could not load supported tokens" }, { status: 502 });
  const tokens: Token[] = (r.data as Token[])
    .filter((t) => typeof t.assetId === "string" && typeof t.decimals === "number" && t.symbol && t.blockchain)
    .map(({ assetId, symbol, blockchain, decimals, price, priceUpdatedAt, contractAddress }) => ({ assetId, symbol, blockchain, decimals, price, priceUpdatedAt, contractAddress }));
  return NextResponse.json(tokens);
}
