import assert from "node:assert/strict";
import test from "node:test";
import { buildPrintableDocumentHtml } from "../lib/pdf-documents.ts";

test("buildPrintableDocumentHtml creates invoice document HTML", () => {
  const html = buildPrintableDocumentHtml({
    title: "請求書",
    issuerName: "山田電工",
    rows: [
      ["書類種別", "請求書"],
      ["宛先", "確認建設"],
      ["請求番号", "INV-20260706"],
      ["請求日", "2026-07-06"],
      ["件名", "照明工事"],
      ["人工数", "2"],
      ["人工単価", "￥25,000"],
      ["人工費", "￥50,000"],
      ["材料費", "￥10,000"],
      ["その他費用", "￥0"],
      ["小計", "￥60,000"],
      ["消費税", "￥6,000"],
      ["合計", "￥66,000"],
      ["振込先", "現場銀行 本店 普通 1234567"]
    ]
  });

  assert.match(html, /御 請 求 書/);
  assert.match(html, /INV-20260706/);
  assert.match(html, /確認建設/);
  assert.match(html, /￥66,000/);
  assert.match(html, /第1振込先/);
});

test("buildPrintableDocumentHtml creates estimate document HTML", () => {
  const html = buildPrintableDocumentHtml({
    title: "見積書",
    issuerName: "山田電工",
    rows: [
      ["書類種別", "見積書"],
      ["宛先", "確認建設"],
      ["見積No", "EST-20260706"],
      ["見積作成日", "2026-07-06"],
      ["件名", "分電盤工事"],
      ["工期", "2026年7月"],
      ["工事場所", "東京都"],
      ["作業内容", "分電盤交換"],
      ["数量", "1"],
      ["単位", "式"],
      ["単価", "￥80,000"],
      ["小計", "￥80,000"],
      ["消費税", "￥8,000"],
      ["合計", "￥88,000"]
    ]
  });

  assert.match(html, /御　見　積　書/);
  assert.match(html, /EST-20260706/);
  assert.match(html, /分電盤交換/);
  assert.match(html, /￥88,000/);
});

test("buildPrintableDocumentHtml creates receipt list document and escapes unsafe text", () => {
  const html = buildPrintableDocumentHtml({
    title: "領収書一覧",
    issuerName: "山田電工",
    rows: [
      [`<script>alert("x")</script>`, "2026-07-06 / ￥2,200 / 未処理"],
      ["コーナン", "2026-07-06 / ￥3,300 / 処理済み"]
    ]
  });

  assert.match(html, /領収書一覧/);
  assert.match(html, /&lt;script&gt;alert\(&quot;x&quot;\)&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>alert/);
  assert.match(html, /コーナン/);
});
