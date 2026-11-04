// Local activity history. Stores only real values returned by 1Click for live quotes.
export type ActivityItem = {
  depositAddress: string;
  depositMemo?: string;
  createdAt: string;
  fromLabel: string;
  toLabel: string;
  amountIn: string;
  expectedOut: string;
  minOut?: string;
  recipient: string;
  originChain: string;
  destChain?: string;
  deadline?: string;
  depositTxHash?: string;
  lastStatus?: string;
};
const KEY = "bridgen.activity.v1";
export function loadActivity(): ActivityItem[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
export function saveActivity(item: ActivityItem) {
  const all = loadActivity().filter((a) => a.depositAddress !== item.depositAddress);
  localStorage.setItem(KEY, JSON.stringify([item, ...all].slice(0, 50)));
}
export function updateActivity(addr: string, patch: Partial<ActivityItem>) {
  const all = loadActivity().map((a) => (a.depositAddress === addr ? { ...a, ...patch } : a));
  localStorage.setItem(KEY, JSON.stringify(all));
}
