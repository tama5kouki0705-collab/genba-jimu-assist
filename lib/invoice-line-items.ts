import type { Invoice, InvoiceLineItem } from "@/lib/types";

export const MIN_INVOICE_LINE_ITEMS = 3;
export const MAX_INVOICE_LINE_ITEMS = 15;

export const INVOICE_LINE_ITEM_CATEGORIES = [
  "人工代",
  "材料費",
  "車両代",
  "工事費",
  "出張費",
  "交通費",
  "駐車場代",
  "高速代",
  "運搬費",
  "諸経費",
  "残材処分費",
  "重機代",
  "道具代",
  "消耗品費",
  "外注費",
  "夜間作業費",
  "休日作業費",
  "追加工事費",
  "手直し費",
  "値引き",
  "その他"
] as const;

export const INVOICE_LINE_ITEM_UNITS = ["式", "人工", "日", "時間", "m", "m2", "個", "台", "回"] as const;

function toFiniteNumber(value: unknown) {
  const numberValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function toNullableNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const numberValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

export function lineItemAmount(item: Pick<InvoiceLineItem, "amount" | "quantity" | "unitPrice">) {
  const directAmount = toFiniteNumber(item.amount);
  if (directAmount !== 0) return directAmount;
  return toFiniteNumber(item.quantity) * toFiniteNumber(item.unitPrice);
}

export function isInvoiceLineItemFilled(item: Partial<InvoiceLineItem>) {
  return Boolean(String(item.description ?? "").trim()) || toNullableNumber(item.quantity) !== null || toNullableNumber(item.unitPrice) !== null || toFiniteNumber(item.amount) !== 0;
}

export function normalizeInvoiceLineItem(item: Partial<InvoiceLineItem>, fallbackId: string): InvoiceLineItem {
  const quantity = toNullableNumber(item.quantity);
  const unitPrice = toNullableNumber(item.unitPrice);
  const rawAmount = (item as { amount?: unknown }).amount;
  const amount = rawAmount === undefined || rawAmount === null || rawAmount === "" ? toFiniteNumber(quantity) * toFiniteNumber(unitPrice) : toFiniteNumber(rawAmount);
  return {
    id: String(item.id || fallbackId),
    category: String(item.category || "その他").trim() || "その他",
    description: String(item.description || "").trim(),
    quantity,
    unit: String(item.unit || "式").trim() || "式",
    unitPrice,
    amount
  };
}

export function invoiceLineItemsFromLegacy(invoice: Pick<Invoice, "workDescription" | "laborCount" | "dailyRate" | "materialCost" | "otherCost" | "subtotal">) {
  const fallbackSubtotal =
    toFiniteNumber(invoice.subtotal) ||
    toFiniteNumber(invoice.laborCount) * toFiniteNumber(invoice.dailyRate) +
    toFiniteNumber(invoice.materialCost) +
    toFiniteNumber(invoice.otherCost);
  if (!fallbackSubtotal && !String(invoice.workDescription || "").trim()) return [];
  return [
    {
      id: "legacy-line-1",
      category: "工事費",
      description: String(invoice.workDescription || "工事一式").trim(),
      quantity: 1,
      unit: "式",
      unitPrice: fallbackSubtotal,
      amount: fallbackSubtotal
    }
  ] satisfies InvoiceLineItem[];
}

export function normalizeInvoiceLineItems(items: unknown, legacyInvoice?: Pick<Invoice, "workDescription" | "laborCount" | "dailyRate" | "materialCost" | "otherCost" | "subtotal">) {
  const normalized = Array.isArray(items)
    ? items
        .map((item, index) => normalizeInvoiceLineItem(item as Partial<InvoiceLineItem>, `line-${index + 1}`))
        .filter(isInvoiceLineItemFilled)
        .slice(0, MAX_INVOICE_LINE_ITEMS)
    : [];
  if (normalized.length) return normalized;
  return legacyInvoice ? invoiceLineItemsFromLegacy(legacyInvoice) : [];
}

export function calculateInvoiceTotals(lineItems: InvoiceLineItem[], taxRate: number) {
  const subtotal = lineItems.reduce((sum, item) => sum + toFiniteNumber(item.amount), 0);
  const taxAmount = Math.round(subtotal * toFiniteNumber(taxRate) / 100);
  return {
    subtotal,
    taxAmount,
    totalAmount: subtotal + taxAmount
  };
}
