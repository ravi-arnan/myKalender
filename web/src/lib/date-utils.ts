export const MONTH_NAMES_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export const WEEKDAY_SHORT_ID = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}

export function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

export function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

export function startOfWeek(d: Date): Date {
  const r = new Date(d);
  r.setDate(d.getDate() - d.getDay());
  r.setHours(0, 0, 0, 0);
  return r;
}

export function endOfWeek(d: Date): Date {
  const r = startOfWeek(d);
  r.setDate(r.getDate() + 6);
  r.setHours(23, 59, 59, 999);
  return r;
}

export function startOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

export function endOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(23, 59, 59, 999);
  return r;
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(d.getDate() + n);
  return r;
}

export function addWeeks(d: Date, n: number): Date {
  return addDays(d, n * 7);
}

export function getWeekDates(d: Date): Date[] {
  const start = startOfWeek(d);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function getMonthGridDates(viewDate: Date): Date[] {
  const monthStart = startOfMonth(viewDate);
  const gridStart = startOfWeek(monthStart);
  const dates: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    dates.push(d);
  }
  return dates;
}

export function formatTime(d: Date): string {
  return d.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateInput(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatTimeInput(d: Date): string {
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

export function parseDateTimeInput(date: string, time: string): Date {
  return new Date(`${date}T${time}`);
}
