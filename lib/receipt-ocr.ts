"use client";

import { fileToDataUrl } from "./client-files.ts";

export const RECEIPT_ACCOUNT_CATEGORIES = ["材料費", "消耗品費", "交通費", "外注費", "通信費", "接待交際費", "その他"] as const;
export type ReceiptAccountCategory = typeof RECEIPT_ACCOUNT_CATEGORIES[number];

export type ReceiptOcrFields = {
  date: string;
  storeName: string;
  amount: number;
  taxAmount: number;
  purpose: ReceiptAccountCategory;
  memo: string;
  rawText: string;
};

function localDateInput(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatReceiptDate(year: string | number, month: string | number, day: string | number) {
  const yearNumber = Number(year);
  const monthNumber = Number(month);
  const dayNumber = Number(day);
  const date = new Date(yearNumber, monthNumber - 1, dayNumber);
  if (date.getFullYear() !== yearNumber || date.getMonth() !== monthNumber - 1 || date.getDate() !== dayNumber) return "";
  return `${yearNumber}-${String(monthNumber).padStart(2, "0")}-${String(dayNumber).padStart(2, "0")}`;
}

export function normalizeReceiptText(text: string) {
  return text
    .replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0))
    .replace(/[Ａ-Ｚａ-ｚ]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0))
    .replace(/[：]/g, ":")
    .replace(/[－―]/g, "-")
    .replace(/[¥]/g, "￥");
}

function normalizeReceiptNumberText(text: string) {
  return normalizeReceiptText(text)
    .replace(/[Oo]/g, "0")
    .replace(/[Il｜|]/g, "1")
    .replace(/[ＳS]/g, "5");
}

function receiptLines(text: string) {
  return normalizeReceiptText(text)
    .split(/\n+/)
    .map((value) => value.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function parseReceiptDate(text: string) {
  const normalized = normalizeReceiptNumberText(text);
  const western = normalized.match(/(20\d{2}|[0-9]{2})\s*[\/.\-年]\s*(\d{1,2})\s*[\/.\-月]\s*(\d{1,2})/);
  if (western) {
    const [, rawYear, month, day] = western;
    const year = rawYear.length === 2 ? `20${rawYear}` : rawYear;
    return formatReceiptDate(year, month, day);
  }

  const reiwa = normalized.match(/(?:令和|R)\s*(\d{1,2})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日?/i);
  if (reiwa) {
    const [, eraYear, month, day] = reiwa;
    const year = String(2018 + Number(eraYear));
    return formatReceiptDate(year, month, day);
  }

  const monthDay = normalized.match(/(\d{1,2})\s*月\s*(\d{1,2})\s*日/);
  if (!monthDay) return "";
  const [, month, day] = monthDay;
  return formatReceiptDate(localDateInput().slice(0, 4), month, day);
}

function parseReceiptAmounts(text: string) {
  const normalized = normalizeReceiptNumberText(text);
  const lines = normalized.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const excludedAmountLine = /(TEL|電話|登録番号|No\.?|番号|〒|住所|郵便|時刻|時間|釣|お釣|預|お預|お預り|お預かり|返金|値引|割引|ポイント|対象|税抜|税率|単価|数量|個数|点数|点|個)/i;
  const dateLike = /(20\d{2}|[0-9]{2})\s*[\/.\-年]\s*\d{1,2}\s*[\/.\-月]\s*\d{1,2}/;
  const moneyFrom = (line: string) => {
    if (excludedAmountLine.test(line)) return [];
    if (dateLike.test(line)) return [];
    return Array.from(line.matchAll(/(?:￥\s*)?(\d{1,3}(?:[,，]\d{3})+|\d{2,7})\s*(?:円)?/g))
      .map((match) => Number(match[1].replace(/[，,]/g, "")))
      .filter((value) => value >= 10 && value <= 9999999);
  };
  const scoreTotalLine = (line: string) => {
    let score = 0;
    if (/(総合計|お支払い金額|お支払金額|領収金額|領収額|税込合計|請求金額|利用金額|ご利用額|総額)/.test(line)) score += 8;
    if (/(合計|税込|お買上げ?|お会計|お支払|お支払い)/.test(line)) score += 5;
    if (/(小計|現計|合\s*計|計)/.test(line)) score += 2;
    if (/[￥円]/.test(line)) score += 1;
    if (/(釣|お釣|預|お預|税抜|消費税|内税|税額|対象|率|点|個|数量|単価|割引|値引)/.test(line)) score -= 6;
    return score;
  };
  const lineValues = lines.map((line, index) => ({ line, index, score: scoreTotalLine(line), values: moneyFrom(line) }));
  const totalLine = lineValues
    .filter((item) => item.score > 0 && item.values.length > 0)
    .sort((a, b) => b.score - a.score || Math.max(...b.values) - Math.max(...a.values))[0];
  const totalLabelOnly = lineValues.find((item) => item.score >= 5 && item.values.length === 0);
  const nextLineTotal = totalLabelOnly ? lineValues.slice(totalLabelOnly.index + 1, totalLabelOnly.index + 3).find((item) => item.values.length > 0) : undefined;
  const allAmounts = lineValues.flatMap((item) => item.values);
  const amount = totalLine ? Math.max(...totalLine.values) : Math.max(0, ...allAmounts);
  const amountFromNextLine = !totalLine && nextLineTotal ? Math.max(...nextLineTotal.values) : amount;
  const taxAmounts = lines
    .filter((line) => /(消費税|内税|税額|税)/.test(line) && !/(税抜|対象)/.test(line))
    .flatMap((line) => Array.from(line.matchAll(/(?:￥\s*)?(\d{1,3}(?:[,，]\d{3})+|\d{2,7})\s*(?:円)?/g)).map((match) => Number(match[1].replace(/[，,]/g, ""))))
    .filter((value) => !amountFromNextLine || value < amountFromNextLine);
  const taxAmount = Math.max(0, ...taxAmounts);
  return { amount: amountFromNextLine, taxAmount };
}

function parseReceiptStoreName(text: string) {
  const ignored = /(領収書|レシート|納品書|請求書|合計|小計|税込|消費税|内税|電話|TEL|登録番号|No\.?|日時|日付|釣|預|担当|明細|利用|取引|伝票|〒)/i;
  const lines = receiptLines(text).slice(0, 12);
  const knownStore = lines.find((value) => /(コーナン|カインズ|ビバホーム|建デポ|ローソン|セブン|ファミリーマート|ファミマ|ミニストップ|ENEOS|出光|apollostation|COSMO|タイムズ|三井のリパーク|ダイソー|ワークマン|モノタロウ)/i.test(value));
  if (knownStore) return knownStore;
  const line = lines.find((value) => value.length >= 2 && value.length <= 28 && !ignored.test(value) && !/\d{2,4}[\/.\-年]/.test(value) && !/[￥円]?\s*\d{2,7}\s*円?/.test(value) && /[ぁ-んァ-ヶ一-龠A-Za-z]/.test(value));
  return line || "";
}

function guessReceiptPurpose(text: string): ReceiptAccountCategory {
  if (/(外注|応援|人工|請負|協力会社|一式工事)/i.test(text)) return "外注費";
  if (/(携帯|スマホ|通信|wifi|Wi-Fi|インターネット|電話料金|切手|郵便|レターパック)/i.test(text)) return "通信費";
  if (/(接待|会食|贈答|手土産|飲食|居酒屋|レストラン|喫茶|コーヒー)/i.test(text)) return "接待交際費";
  if (/(駐車|パーキング|parking|PARKING|高速|電車|鉄道|バス|タクシー|ガソリン|給油|ENEOS|出光|apollostation|COSMO|タイムズ|三井のリパーク)/i.test(text)) return "交通費";
  if (/(工具|ドリル|ビット|レンチ|カッター|刃|安全靴|手袋|養生|テープ|軍手|電池|電球|文具|コピー|ダイソー|ワークマン)/i.test(text)) return "消耗品費";
  if (/(材料|電材|木材|塗料|配管|ケーブル|VVF|CV|PF管|ビス|ねじ|コーナン|カインズ|ビバホーム|建デポ|モノタロウ)/i.test(text)) return "材料費";
  return "その他";
}

function parseReceiptMemo(text: string, storeName: string) {
  const ignored = /(領収書|レシート|納品書|請求書|合計|総合計|小計|税込|消費税|内税|領収金額|お支払|お支払い|電話|TEL|登録番号|No\.?|日時|日付|釣|預|担当|明細|利用|取引|伝票|〒|現計|対象|税率)/i;
  const datePattern = /(20\d{2}|[0-9]{2})\s*[\/.\-年]\s*\d{1,2}\s*[\/.\-月]\s*\d{1,2}|(?:令和|R)\s*\d{1,2}\s*年/i;
  const moneyPattern = /[￥円]?\s*\d{2,7}\s*円?/;
  const candidates = receiptLines(text)
    .slice(0, 24)
    .filter((line) => line !== storeName)
    .filter((line) => line.length >= 2 && line.length <= 36)
    .filter((line) => !ignored.test(line))
    .filter((line) => !datePattern.test(line))
    .filter((line) => !moneyPattern.test(line))
    .filter((line) => /[ぁ-んァ-ヶ一-龠A-Za-z]/.test(line));
  return candidates[0] || "";
}

export function parseReceiptOcr(text: string): ReceiptOcrFields {
  const normalized = normalizeReceiptText(text);
  const { amount, taxAmount } = parseReceiptAmounts(normalized);
  const storeName = parseReceiptStoreName(normalized);
  return {
    date: parseReceiptDate(normalized),
    storeName,
    amount,
    taxAmount,
    purpose: guessReceiptPurpose(normalized),
    memo: parseReceiptMemo(normalized, storeName),
    rawText: normalized
  };
}

export function scoreReceiptOcr(fields: ReceiptOcrFields) {
  return Number(Boolean(fields.date)) + Number(Boolean(fields.storeName)) + Number(fields.amount > 0) + Number(Boolean(fields.purpose)) + Number(Boolean(fields.memo));
}

export async function prepareReceiptImage(file: File) {
  const bitmap = await createImageBitmap(file);
  const maxSide = 1800;
  const scale = Math.min(2, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return fileToDataUrl(file);

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const image = context.getImageData(0, 0, width, height);
  const data = image.data;
  for (let index = 0; index < data.length; index += 4) {
    const gray = data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114;
    const adjusted = gray > 190 ? 255 : gray < 90 ? 0 : Math.min(255, Math.max(0, (gray - 90) * 2.1));
    data[index] = adjusted;
    data[index + 1] = adjusted;
    data[index + 2] = adjusted;
  }
  context.putImageData(image, 0, 0);
  return canvas.toDataURL("image/jpeg", 0.92);
}
