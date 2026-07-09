import type { WorkLog } from "./types";

export function deterministicWorkLogId(accountId: string, date: string, siteId: string) {
  const raw = [accountId || "local", date || "no-date", siteId || "no-site"].join("-");
  return `work-${raw.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "")}`;
}

export function findMatchingWorkLog(workLogs: WorkLog[], date: string, siteId: string) {
  return workLogs.find((log) => log.date === date && log.siteId === siteId)
    || workLogs.find((log) => log.date === date && !log.siteId && !siteId);
}
