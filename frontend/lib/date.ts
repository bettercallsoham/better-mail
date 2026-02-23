import { format, isToday, isYesterday, isThisYear, isThisWeek } from "date-fns";

export function formatThreadDate(dateStr: string): string {
  const date = new Date(dateStr);
  if (isToday(date)) return format(date, "h:mm a");
  if (isYesterday(date)) return "Yesterday";
  if (isThisWeek(date)) return format(date, "EEE");
  if (isThisYear(date)) return format(date, "MMM d");
  return format(date, "MMM d, yyyy");
}

export function getDateGroupLabel(dateStr: string): string {
  const date = new Date(dateStr);
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  if (isThisWeek(date)) return format(date, "EEEE");
  if (isThisYear(date)) return format(date, "MMMM");
  return format(date, "MMMM yyyy");
}

export function groupByDate<T extends { receivedAt: string }>(
  items: T[],
): { label: string; items: T[] }[] {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const label = getDateGroupLabel(item.receivedAt);
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(item);
  }
  return Array.from(map.entries()).map(([label, items]) => ({ label, items }));
}
