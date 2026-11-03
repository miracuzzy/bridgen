import type { GuardCheck } from "@/lib/guard";
import { Badge } from "./ui";

const tone = { passed: "ok", failed: "bad", unverified: "warn" } as const;
const word = { passed: "Passed", failed: "Failed", unverified: "Unable to verify" } as const;

export function GuardList({ checks }: { checks: GuardCheck[] }) {
  return (
    <ul className="space-y-2">
      {checks.map((c) => (
        <li key={c.id} className="rounded-xl border border-white/10 bg-black/30 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-medium">
              {c.label}
              {!c.mandatory && <span className="ml-2 text-xs text-white/40">advisory</span>}
            </span>
            <Badge tone={tone[c.status]}>{word[c.status]}</Badge>
          </div>
          <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-xs text-white/50">
            <span>{c.detail}</span>
            <span className={c.enforcedBy === "protocol" ? "text-orange-300/80" : "text-white/40"}>
              {c.enforcedBy === "protocol" ? "Enforced by 1Click quote" : "Checked by Bridgen only"}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
