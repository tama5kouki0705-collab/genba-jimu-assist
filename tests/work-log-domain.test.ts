import test from "node:test";
import assert from "node:assert/strict";

import { normalizeTrade } from "../lib/trade-report-fields.ts";
import { deterministicWorkLogId, findMatchingWorkLog } from "../lib/work-log-domain.ts";
import type { WorkLog } from "../lib/types.ts";

test("deterministicWorkLogId is stable per account date and site", () => {
  const id = deterministicWorkLogId("local:user@example.com", "2026-07-10", "site-1");
  assert.equal(id, deterministicWorkLogId("local:user@example.com", "2026-07-10", "site-1"));
  assert.notEqual(id, deterministicWorkLogId("local:user@example.com", "2026-07-10", "site-2"));
});

test("deterministicWorkLogId normalizes unsafe characters", () => {
  assert.equal(deterministicWorkLogId("User @ Example", "2026/07/10", ""), "work-user-example-2026-07-10-no-site");
});

test("normalizeTrade keeps supported trades and falls back to other", () => {
  assert.equal(normalizeTrade("解体"), "解体");
  assert.equal(normalizeTrade("電気工事"), "その他");
  assert.equal(normalizeTrade(""), "その他");
});

test("findMatchingWorkLog reuses the same date and site draft", () => {
  const baseLog = {
    id: "work-a",
    date: "2026-07-10",
    siteId: "site-a",
    siteName: "A",
    trade: "",
    workers: "自分",
    memo: "",
    weather: "☀️",
    progressPercent: 0,
    foreman: "自分",
    machinery: "",
    wasteRecord: "",
    tomorrowPlan: "",
    notes: "",
    photoUrls: [],
    receiptDone: false,
    photoDone: false,
    invoiceReady: false,
    createdAt: "",
    updatedAt: "",
    workStartAt: "",
    workEndAt: "",
    tradeDetails: null
  } satisfies WorkLog;

  const logs = [baseLog, { ...baseLog, id: "work-b", siteId: "site-b" }];
  assert.equal(findMatchingWorkLog(logs, "2026-07-10", "site-a")?.id, "work-a");
  assert.equal(findMatchingWorkLog(logs, "2026-07-10", "site-b")?.id, "work-b");
  assert.equal(findMatchingWorkLog(logs, "2026-07-11", "site-a"), undefined);
});
