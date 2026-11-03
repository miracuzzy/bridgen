// Lightweight recipient format checks. These catch obvious typos only.
// Returns null when Bridgen has no rule for that chain (reported as "Unable to verify").

const EVM = new Set(["eth", "base", "arb", "op", "pol", "bsc", "avax", "gnosis", "bera", "scroll", "monad", "abs", "xlayer", "plasma"]);

export function checkAddressFormat(chain: string, address: string): boolean | null {
  const a = address.trim();
  if (!a) return false;
  if (EVM.has(chain)) return /^0x[0-9a-fA-F]{40}$/.test(a);
  if (chain === "near") {
    if (/^[0-9a-f]{64}$/.test(a)) return true; // implicit account
    return /^(([a-z\d]+[-_])*[a-z\d]+\.)*([a-z\d]+[-_])*[a-z\d]+$/.test(a) && a.length >= 2 && a.length <= 64;
  }
  if (chain === "sol") return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(a);
  if (chain === "btc") return /^(bc1[02-9ac-hj-np-z]{11,71}|[13][1-9A-HJ-NP-Za-km-z]{25,34})$/.test(a);
  if (chain === "tron") return /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(a);
  return null;
}
