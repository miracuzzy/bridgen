// Case-insensitive filter for selector options. Matches label or any keyword, exact and prefix matches first.
export type Option = { value: string; label: string; hint?: string; keywords?: string[] };

export function filterOptions(options: Option[], query: string): Option[] {
  const q = query.trim().toLowerCase();
  if (!q) return options;
  const score = (o: Option) => {
    const words = [o.label, ...(o.keywords ?? [])].map((w) => w.toLowerCase());
    if (words.some((w) => w === q)) return 0;
    if (words.some((w) => w.startsWith(q))) return 1;
    if (words.some((w) => w.includes(q))) return 2;
    return -1;
  };
  return options.map((o) => [o, score(o)] as const).filter(([, s]) => s >= 0).sort((a, b) => a[1] - b[1]).map(([o]) => o);
}
