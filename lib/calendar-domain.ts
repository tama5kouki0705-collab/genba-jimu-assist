import type { CalendarItem } from "@/lib/types";

export function localDateInput(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function monthInput(date = new Date()) {
  return localDateInput(date).slice(0, 7);
}

export function daysLeft(date: string) {
  if (!date) return 9999;
  return Math.ceil((new Date(date).getTime() - Date.now()) / 86400000);
}

export function isCurrentMonth(date: string) {
  return Boolean(date && date.slice(0, 7) === localDateInput().slice(0, 7));
}

export function parseMonthInput(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(year, (monthNumber || 1) - 1, 1);
}

export function addMonths(month: string, amount: number) {
  const date = parseMonthInput(month);
  date.setMonth(date.getMonth() + amount);
  return monthInput(date);
}

export function calendarCells(month: string) {
  const firstDay = parseMonthInput(month);
  const firstCell = new Date(firstDay);
  firstCell.setDate(firstDay.getDate() - firstDay.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(firstCell);
    date.setDate(firstCell.getDate() + index);
    return localDateInput(date);
  });
}

export function datesBetween(startDate: string, endDate: string) {
  if (!startDate || !endDate || endDate < startDate) return [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  const dates: string[] = [];
  for (let date = new Date(start); date <= end && dates.length < 120; date.setDate(date.getDate() + 1)) {
    dates.push(localDateInput(date));
  }
  return dates;
}

export function calendarKindClass(kind: CalendarItem["kind"]) {
  if (kind === "予定") return "bg-cyan-100 text-cyan-800";
  if (kind === "現場") return "bg-genba text-white";
  if (kind === "作業") return "bg-indigo-100 text-indigo-800";
  if (kind === "領収書") return "bg-emerald-100 text-emerald-800";
  if (kind === "請求書") return "bg-skysoft text-genba";
  if (kind === "見積") return "bg-amber-100 text-amber-800";
  return "bg-red-100 text-red-700";
}
