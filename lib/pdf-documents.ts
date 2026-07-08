import { moneyRows } from "./document-template.ts";
import { escapeHtml } from "./security.ts";

export type PrintableDocumentInput = {
  title: string;
  rows: Array<[string, string] | [string, string, string]>;
  issuerName?: string;
};

function rowsToValues(rows: Array<[string, string] | [string, string, string]>) {
  return Object.fromEntries(rows.map(([key, value]) => [key, value || ""]));
}

function buildDocumentRows(values: Record<string, string>, minimumRows = 10) {
  const rows = moneyRows(values);
  return Array.from({ length: Math.max(minimumRows, rows.length) }, (_, index) => {
    const row = rows[index] || ["", "", "", "", ""];
    return `<tr><td class="num">${row[0] ? index + 1 : ""}</td><td>${escapeHtml(row[0])}</td><td class="num">${escapeHtml(row[1])}</td><td>${escapeHtml(row[2])}</td><td class="num">${escapeHtml(row[3])}</td><td class="num">${escapeHtml(row[4])}</td></tr>`;
  }).join("");
}

function commonStyles() {
  return `
  * { box-sizing: border-box; }
  body { margin: 0; background: #eceff3; color: #111; font-family: -apple-system, BlinkMacSystemFont, "Hiragino Sans", "Yu Gothic", "Meiryo", sans-serif; }
  .sheet { width: min(210mm, calc(100vw - 20px)); min-height: 297mm; margin: 14px auto; padding: 15mm 17mm; background: white; box-shadow: 0 12px 28px rgba(23, 32, 51, 0.16); }
  h1 { margin: 0 0 10mm; text-align: center; font-size: 28px; letter-spacing: .22em; font-weight: 800; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  th { border: 1px solid #111; background: #f4f4f4; font-size: 12px; padding: 7px 6px; text-align: center; }
  td { border: 1px solid #111; padding: 8px 6px; font-size: 12px; vertical-align: top; word-break: break-word; height: 9mm; }
  .num { text-align: right; white-space: nowrap; }
  .bottom { margin-top: 8mm; display: grid; gap: 4mm; font-size: 12px; line-height: 1.7; }
  .box { border: 1px solid #111; min-height: 18mm; padding: 3mm; }
  .box-title { font-weight: 800; margin-bottom: 1.5mm; }
  @media print {
    body { background: white; }
    .sheet { width: 210mm; min-height: 297mm; margin: 0; box-shadow: none; }
  }`;
}

function buildMoneyDocumentHtml({ title, rows, issuerName = "" }: PrintableDocumentInput) {
  const values = rowsToValues(rows);
  const isInvoice = title === "請求書";
  const issueDate = values[isInvoice ? "請求日" : "見積作成日"] || new Date().toLocaleDateString("ja-JP");
  const docNo = `${isInvoice ? "INV" : "EST"}-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}`;
  const documentNumber = values[isInvoice ? "請求番号" : "見積No"] || docNo;
  const subject = values["件名"] || values["現場"] || values["作業内容"] || "工事一式";
  const displayIssuerName = issuerName || "発行者未設定";

  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
<style>
${commonStyles()}
  .doc-meta { display: grid; grid-template-columns: 1fr 48mm; gap: 12mm; font-size: 12px; }
  .meta-right { line-height: 1.9; }
  .client-name { margin-top: 3mm; border-bottom: 1px solid #111; font-size: 20px; font-weight: 700; min-height: 12mm; }
  .client-name span { margin-left: 6mm; font-size: 13px; font-weight: 500; }
  .subject-box { margin-top: 8mm; display: grid; gap: 2mm; font-size: 13px; }
  .subject-box div { display: grid; grid-template-columns: 25mm 1fr; border-bottom: 1px solid #bbb; padding-bottom: 1.5mm; }
  .issuer { margin-top: 3mm; line-height: 1.7; text-align: left; }
  .issuer strong { display: block; margin-bottom: 1mm; font-size: 14px; }
  .total { margin: 8mm 0 7mm; display: grid; grid-template-columns: 32mm 1fr 18mm; width: 92mm; border: 2px solid #111; }
  .total div { padding: 3mm 4mm; border-right: 1px solid #111; }
  .total div:last-child { border-right: 0; text-align: center; }
  .total .label { text-align: center; font-weight: 800; background: #f5f5f5; }
  .total .amount { text-align: right; font-size: 20px; font-weight: 900; }
  .summary { margin-left: auto; margin-top: 0; width: 66mm; }
  .summary div { display: grid; grid-template-columns: 1fr 1.3fr; border: 1px solid #111; border-top: 0; font-size: 12px; }
  .summary span { padding: 7px 8px; background: #f4f4f4; border-right: 1px solid #111; font-weight: 700; }
  .summary strong { padding: 7px 8px; text-align: right; }
  .summary .grand { font-size: 15px; }
</style>
</head>
<body>
<main class="sheet">
  <h1>${isInvoice ? "御 請 求 書" : "御　見　積　書"}</h1>
  <section class="doc-meta">
    <div>
      <div class="client-name">${escapeHtml(values["宛先"] || "御中")} <span>御中</span></div>
      <div class="subject-box">
        <div><b>件名：</b><span>${escapeHtml(subject)}</span></div>
        ${!isInvoice ? `<div><b>工期：</b><span>${escapeHtml(values["工期"] || "-")}</span></div>` : ""}
        ${!isInvoice ? `<div><b>工事場所：</b><span>${escapeHtml(values["工事場所"] || values["現場"] || "-")}</span></div>` : ""}
        <div><b>支払条件：</b><span>${escapeHtml(values["支払条件"] || "-")}</span></div>
        <div><b>${isInvoice ? "支払期日：" : "見積期限："}</b><span>${escapeHtml(values[isInvoice ? "支払期日" : "有効期限"] || "-")}</span></div>
      </div>
    </div>
    <div class="meta-right">
      <div>${isInvoice ? "請求番号" : "No"}：${escapeHtml(documentNumber)}</div>
      <div>${isInvoice ? "請求日" : "見積作成日"}：${escapeHtml(issueDate)}</div>
      <div class="issuer">
      <strong>${escapeHtml(displayIssuerName)}</strong>
      ${values["発行者郵便番号"] ? `〒${escapeHtml(values["発行者郵便番号"])}<br />` : ""}
      ${escapeHtml(values["発行者住所"] || "")}<br />
      ${values["発行者電話"] ? `TEL：${escapeHtml(values["発行者電話"])}<br />` : ""}
      ${values["発行者FAX"] ? `FAX：${escapeHtml(values["発行者FAX"])}<br />` : ""}
      ${values["発行者メール"] ? `Mail：${escapeHtml(values["発行者メール"])}<br />` : ""}
      ${values["担当者"] ? `担当：${escapeHtml(values["担当者"])}<br />` : ""}
      ${escapeHtml(values["登録番号"] || "")}
      </div>
    </div>
  </section>
  <section class="total">
    <div class="label">金額</div>
    <div class="amount">${escapeHtml(values["合計"] || "-")}</div>
    <div>税込</div>
  </section>
  <table>
    <thead>
      <tr><th style="width:12mm">No.</th><th>項目名</th><th style="width:20mm">数量</th><th style="width:18mm">単位</th><th style="width:28mm">単価</th><th style="width:30mm">金額</th></tr>
    </thead>
    <tbody>${buildDocumentRows(values)}</tbody>
  </table>
  <section class="summary">
    <div><span>小計</span><strong>${escapeHtml(values["小計"] || "-")}</strong></div>
    <div><span>消費税</span><strong>${escapeHtml(values["消費税"] || "-")}</strong></div>
    <div class="grand"><span>合計</span><strong>${escapeHtml(values["合計"] || "-")}</strong></div>
  </section>
  <section class="bottom">
  <div class="box">
    <div class="box-title">備考</div>
    ${escapeHtml(values["備考"] || "下記の通り、よろしくお願いいたします。")}
  </div>
  ${isInvoice ? `<div class="box">
    <div class="box-title">第1振込先</div>
    ${escapeHtml(values["振込先"] || "プロフィールの振込先を登録してください")}
  </div>` : ""}
  </section>
</main>
</body>
</html>`;
}

function buildListDocumentHtml({ title, rows, issuerName = "" }: PrintableDocumentInput) {
  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
<style>
${commonStyles()}
  h1 { text-align: left; letter-spacing: 0; margin-bottom: 5mm; }
  .meta { display: flex; justify-content: space-between; gap: 8mm; margin-bottom: 8mm; color: #566576; font-size: 12px; }
  .list-table th:first-child { width: 54mm; }
  .empty { margin-top: 12mm; color: #566576; text-align: center; }
</style>
</head>
<body>
<main class="sheet">
  <h1>${escapeHtml(title)}</h1>
  <section class="meta">
    <div>作成日：${escapeHtml(new Date().toLocaleDateString("ja-JP"))}</div>
    <div>${escapeHtml(issuerName || "")}</div>
  </section>
  ${rows.length ? `<table class="list-table">
    <thead><tr><th>項目</th><th>内容</th></tr></thead>
    <tbody>
      ${rows.map(([label, value]) => `<tr><td>${escapeHtml(label || "名称なし")}</td><td>${escapeHtml(value || "-")}</td></tr>`).join("")}
    </tbody>
  </table>` : `<p class="empty">対象データがありません</p>`}
</main>
</body>
</html>`;
}

function parseCurrency(value: string) {
  return Number(value.replace(/[^\d.-]/g, "")) || 0;
}

function buildReceiptListDocumentHtml({ title, rows, issuerName = "" }: PrintableDocumentInput) {
  const receiptRows = rows.map((row) => ({
    date: row[0] || "-",
    purpose: row[1] || "名目未入力",
    amount: row[2] || "￥0"
  }));
  const total = receiptRows.reduce((sum, row) => sum + parseCurrency(row.amount), 0);
  const yen = new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY", maximumFractionDigits: 0 });

  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
<style>
${commonStyles()}
  h1 { text-align: left; letter-spacing: 0; margin-bottom: 5mm; }
  .meta { display: flex; justify-content: space-between; gap: 8mm; margin-bottom: 8mm; color: #566576; font-size: 12px; }
  .receipt-table { table-layout: fixed; }
  .receipt-table th:nth-child(1), .receipt-table td:nth-child(1) { width: 31mm; white-space: nowrap; }
  .receipt-table th:nth-child(3), .receipt-table td:nth-child(3) { width: 34mm; text-align: right; white-space: nowrap; }
  .receipt-table tfoot td { background: #f4f4f4; font-weight: 800; }
  .empty { margin-top: 12mm; color: #566576; text-align: center; }
</style>
</head>
<body>
<main class="sheet">
  <h1>${escapeHtml(title)}</h1>
  <section class="meta">
    <div>作成日：${escapeHtml(new Date().toLocaleDateString("ja-JP"))}</div>
    <div>${escapeHtml(issuerName || "")}</div>
  </section>
  ${receiptRows.length ? `<table class="receipt-table">
    <thead><tr><th>日付</th><th>名目</th><th>金額</th></tr></thead>
    <tbody>
      ${receiptRows.map((row) => `<tr><td>${escapeHtml(row.date)}</td><td>${escapeHtml(row.purpose)}</td><td>${escapeHtml(row.amount)}</td></tr>`).join("")}
    </tbody>
    <tfoot><tr><td colspan="2">合計 ${receiptRows.length}件</td><td>${escapeHtml(yen.format(total))}</td></tr></tfoot>
  </table>` : `<p class="empty">対象データがありません</p>`}
</main>
</body>
</html>`;
}

export function buildPrintableDocumentHtml(input: PrintableDocumentInput) {
  if (input.title === "請求書" || input.title === "見積書") return buildMoneyDocumentHtml(input);
  if (input.title === "領収書一覧") return buildReceiptListDocumentHtml(input);
  return buildListDocumentHtml(input);
}
