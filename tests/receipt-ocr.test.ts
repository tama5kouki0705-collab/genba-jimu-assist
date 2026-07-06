import assert from "node:assert/strict";
import test from "node:test";
import { parseReceiptOcr } from "../lib/receipt-ocr.ts";

test("parseReceiptOcr extracts core receipt fields", () => {
  const parsed = parseReceiptOcr(`
    コーナン 工具館
    2026/07/05
    インパクトビット
    小計 2,000円
    消費税 200円
    合計 2,200円
  `);

  assert.equal(parsed.storeName, "コーナン 工具館");
  assert.equal(parsed.date, "2026-07-05");
  assert.equal(parsed.amount, 2200);
  assert.equal(parsed.taxAmount, 200);
  assert.equal(parsed.purpose, "消耗品費");
  assert.equal(parsed.memo, "インパクトビット");
});

test("parseReceiptOcr handles Reiwa dates and transport purpose", () => {
  const parsed = parseReceiptOcr(`
    ENEOS
    令和8年7月5日
    ガソリン
    お支払い 5,500円
  `);

  assert.equal(parsed.date, "2026-07-05");
  assert.equal(parsed.amount, 5500);
  assert.equal(parsed.purpose, "交通費");
  assert.equal(parsed.memo, "ガソリン");
});

test("parseReceiptOcr prefers total payment labels over smaller tax values", () => {
  const parsed = parseReceiptOcr(`
    建デポ
    2026年7月6日
    VVFケーブル
    消費税 800円
    税込対象額 8,800円
    お支払い金額 ￥8,800
  `);

  assert.equal(parsed.storeName, "建デポ");
  assert.equal(parsed.date, "2026-07-06");
  assert.equal(parsed.amount, 8800);
  assert.equal(parsed.purpose, "材料費");
});

test("parseReceiptOcr does not use cash deposit or change as the receipt amount", () => {
  const parsed = parseReceiptOcr(`
    カインズ
    2026/07/06
    養生テープ
    合計 1,280円
    お預り 2,000円
    お釣り 720円
  `);

  assert.equal(parsed.storeName, "カインズ");
  assert.equal(parsed.amount, 1280);
  assert.equal(parsed.memo, "養生テープ");
});

test("parseReceiptOcr reads an amount from the line after a total label", () => {
  const parsed = parseReceiptOcr(`
    ビバホーム
    2026年7月6日
    塗料
    お支払い金額
    ￥3,450
  `);

  assert.equal(parsed.amount, 3450);
  assert.equal(parsed.purpose, "材料費");
});

test("parseReceiptOcr ignores impossible dates", () => {
  const parsed = parseReceiptOcr(`
    ワークマン
    2026/13/40
    安全靴
    合計 4,900円
  `);

  assert.equal(parsed.date, "");
  assert.equal(parsed.amount, 4900);
});
