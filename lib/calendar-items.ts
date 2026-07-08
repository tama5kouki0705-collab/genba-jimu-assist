import { datesBetween, daysLeft } from "@/lib/calendar-domain";
import { receiptStatusLabel } from "@/lib/receipt-domain";
import type { CalendarItem, CalendarSchedule, Estimate, Invoice, Qualification, Receipt, Site, Vehicle, WorkLog } from "@/lib/types";

type CalendarItemInput = {
  calendarSchedules: CalendarSchedule[];
  sites: Site[];
  receipts: Receipt[];
  workLogs: WorkLog[];
  invoices: Invoice[];
  estimates: Estimate[];
  qualifications: Qualification[];
  vehicles: Vehicle[];
  formatCurrency: (amount: number) => string;
  billingEnabled?: boolean;
};

export function buildCalendarItems({
  calendarSchedules,
  sites,
  receipts,
  workLogs,
  invoices,
  estimates,
  qualifications,
  vehicles,
  formatCurrency,
  billingEnabled = true
}: CalendarItemInput) {
  const items: CalendarItem[] = [];
  const pushItem = (date: string, item: Omit<CalendarItem, "date">) => {
    if (date) items.push({ date, ...item });
  };

  calendarSchedules.forEach((schedule) => {
    const invoiceLabel = billingEnabled ? schedule.invoiceId ? "請求書下書きあり" : "請求書に回せます" : "";
    const timeLabel = schedule.startTime ? `${schedule.startTime}${schedule.endTime ? `-${schedule.endTime}` : ""} / ` : "";
    pushItem(schedule.date, {
      title: schedule.siteName || "予定",
      sub: [timeLabel ? timeLabel.slice(0, -3) : "", schedule.workDescription || "作業予定", schedule.workers || "作業員未入力", invoiceLabel].filter(Boolean).join(" / "),
      kind: "予定"
    });
  });

  sites.forEach((site) => {
    const siteLabel = site.siteName || "現場";
    const siteSub = site.clientCompany || site.address || "現場予定";
    const workDates = datesBetween(site.startDate, site.endDate);
    if (workDates.length) {
      workDates.forEach((date, index) => {
        const isStart = index === 0;
        const isEnd = index === workDates.length - 1;
        pushItem(date, { title: `${siteLabel}${isStart ? " 開始" : isEnd ? " 終了" : " 作業日"}`, sub: siteSub, kind: "現場" });
      });
    } else {
      pushItem(site.startDate, { title: `${siteLabel} 開始`, sub: siteSub, kind: "現場" });
      pushItem(site.endDate, { title: `${siteLabel} 終了`, sub: siteSub, kind: "現場" });
    }
  });

  receipts.forEach((receipt) => {
    pushItem(receipt.date, { title: receipt.storeName || "領収書", sub: `${formatCurrency(receipt.amount || 0)} / ${receiptStatusLabel(receipt.status)}`, kind: "領収書" });
  });
  workLogs.forEach((log) => {
    pushItem(log.date, { title: log.siteName || "日報記入", sub: `${log.workers || "作業員未入力"} / ${log.memo ? "メモあり" : "メモ未入力"}`, kind: "作業" });
  });
  invoices.forEach((invoice) => {
    pushItem(invoice.workDate, { title: invoice.clientCompany || "請求書", sub: `${invoice.workDescription || "作業日"} / ${formatCurrency(invoice.totalAmount || 0)}`, kind: "請求書" });
  });
  estimates.forEach((estimate) => {
    pushItem(estimate.expiryDate, { title: estimate.clientCompany || "見積期限", sub: `${estimate.workDescription || "見積"} / ${formatCurrency(estimate.totalAmount || 0)}`, kind: "見積" });
  });
  qualifications.forEach((qualification) => {
    pushItem(qualification.acquiredDate, { title: `${qualification.qualificationName || "資格"} 取得`, sub: "資格証", kind: "期限" });
    pushItem(qualification.expiryDate, { title: `${qualification.qualificationName || "資格"} 期限`, sub: daysLeft(qualification.expiryDate) <= 30 ? "早めに確認" : "資格証", kind: "期限" });
  });
  vehicles.forEach((vehicle) => {
    pushItem(vehicle.inspectionExpiryDate, { title: `${vehicle.vehicleName || "車両"} 車検`, sub: vehicle.vehicleNumber || "車両期限", kind: "期限" });
    pushItem(vehicle.compulsoryInsuranceExpiryDate, { title: `${vehicle.vehicleName || "車両"} 自賠責`, sub: vehicle.vehicleNumber || "保険期限", kind: "期限" });
    pushItem(vehicle.optionalInsuranceExpiryDate, { title: `${vehicle.vehicleName || "車両"} 任意保険`, sub: vehicle.vehicleNumber || "保険期限", kind: "期限" });
  });

  return items.sort((a, b) => a.date.localeCompare(b.date));
}
