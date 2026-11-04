// Shows API timestamps in the viewer's own time zone, with the zone name so it is never ambiguous.
export function localTime(iso: string | undefined, locale?: string, timeZone?: string): string {
  if (!iso) return "Not provided";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Not provided";
  return d.toLocaleString(locale, { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short", ...(timeZone ? { timeZone } : {}) });
}
