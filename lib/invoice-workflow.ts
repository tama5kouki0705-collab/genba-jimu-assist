import type { CalendarSchedule, Invoice, Site, WorkLog } from "@/lib/types";

export function createInvoiceDraftFromSchedule(schedule: CalendarSchedule, site: Site | undefined, invoiceId: string, today: string): Invoice {
  const laborCount = schedule.laborCount || 1;
  const dailyRate = schedule.dailyRate || site?.dailyRate || 25000;
  const taxRate = 10;
  const subtotal = laborCount * dailyRate;
  const taxAmount = Math.round(subtotal * taxRate / 100);
  return {
    id: invoiceId,
    siteId: schedule.siteId,
    siteName: schedule.siteName || site?.siteName || "",
    clientCompany: schedule.clientCompany || site?.clientCompany || "",
    invoiceNumber: `INV-${schedule.date.replaceAll("-", "")}`,
    issueDate: today,
    subject: schedule.siteName || site?.siteName || "工事一式",
    workDescription: schedule.workDescription || site?.workDescription || `${schedule.siteName || "現場"} 作業`,
    workDate: schedule.date,
    paymentTerms: "月末締め翌月末払い",
    dueDate: "",
    notes: schedule.memo || "",
    laborCount,
    dailyRate,
    materialCost: 0,
    otherCost: 0,
    taxRate,
    subtotal,
    taxAmount,
    totalAmount: subtotal + taxAmount,
    status: "下書き"
  };
}

export function createInvoiceDraftFromWorkLog(workLog: WorkLog, site: Site | undefined, schedule: CalendarSchedule | undefined, invoiceId: string, today: string): Invoice {
  const laborCount = schedule?.laborCount || 1;
  const dailyRate = schedule?.dailyRate || site?.dailyRate || 25000;
  const taxRate = 10;
  const subtotal = laborCount * dailyRate;
  const taxAmount = Math.round(subtotal * taxRate / 100);
  return {
    id: invoiceId,
    siteId: workLog.siteId,
    siteName: workLog.siteName || schedule?.siteName || "",
    clientCompany: schedule?.clientCompany || site?.clientCompany || "",
    invoiceNumber: `INV-${workLog.date.replaceAll("-", "")}`,
    issueDate: today,
    subject: workLog.siteName || schedule?.siteName || "工事一式",
    workDescription: workLog.memo.split("\n").find(Boolean) || schedule?.workDescription || `${workLog.siteName || schedule?.siteName || "現場"} 作業`,
    workDate: workLog.date,
    paymentTerms: "月末締め翌月末払い",
    dueDate: "",
    notes: schedule?.memo || "",
    laborCount,
    dailyRate,
    materialCost: 0,
    otherCost: 0,
    taxRate,
    subtotal,
    taxAmount,
    totalAmount: subtotal + taxAmount,
    status: "下書き"
  };
}
