import { NextRequest } from "next/server";
import { json, limited } from "@/lib/http";

// Reads NEP-145 storage registration for an account on a NEAR token contract. Public RPC view calls only.
const RPC = "https://rpc.mainnet.near.org";
const ACCOUNT = /^(([a-z\d]+[-_])*[a-z\d]+\.)*([a-z\d]+[-_])*[a-z\d]+$/;

async function view(contract: string, method: string, args: object) {
  const r = await fetch(RPC, {
    method: "POST", headers: { "content-type": "application/json" }, cache: "no-store", signal: AbortSignal.timeout(8000),
    body: JSON.stringify({ jsonrpc: "2.0", id: "b", method: "query", params: { request_type: "call_function", finality: "final", account_id: contract, method_name: method, args_base64: Buffer.from(JSON.stringify(args)).toString("base64") } }),
  });
  if (!r.ok) throw new Error("RPC error");
  const j = await r.json();
  if (j.error || j.result?.error) throw new Error("RPC error");
  return JSON.parse(Buffer.from(j.result.result).toString() || "null");
}

export async function GET(req: NextRequest) {
  const rl = limited(req, "near-storage", 60);
  if (rl) return rl;
  const contract = req.nextUrl.searchParams.get("contract") ?? "";
  const accounts = (req.nextUrl.searchParams.get("accounts") ?? "").split(",").filter(Boolean);
  if (!ACCOUNT.test(contract) || contract.length > 64 || accounts.length === 0 || accounts.length > 2 || !accounts.every((a) => ACCOUNT.test(a) && a.length <= 64))
    return json({ error: "Invalid contract or account" }, 400);
  try {
    const bounds = await view(contract, "storage_balance_bounds", {});
    const registered: Record<string, boolean> = {};
    for (const a of accounts) registered[a] = (await view(contract, "storage_balance_of", { account_id: a })) !== null;
    return json({ min: bounds?.min ?? null, registered });
  } catch {
    return json({ error: "Could not read storage from NEAR RPC" }, 502);
  }
}
