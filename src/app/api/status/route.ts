import { NextRequest, NextResponse } from "next/server";
import { getStatus } from "@/lib/oneclick";

export async function GET(req: NextRequest) {
  const addr = req.nextUrl.searchParams.get("depositAddress");
  const memo = req.nextUrl.searchParams.get("depositMemo") ?? undefined;
  if (!addr || addr.length > 128) return NextResponse.json({ error: "depositAddress required" }, { status: 400 });
  const r = await getStatus(addr, memo);
  if (!r.ok) return NextResponse.json({ error: (r.data as { message?: string } | null)?.message || "Status unavailable" }, { status: r.status });
  return NextResponse.json(r.data);
}
