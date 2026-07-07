import test from "node:test";
import assert from "node:assert/strict";
import { calculateInvoiceTotals, normalizeInvoiceLineItems } from "../lib/invoice-line-items.ts";

test("normalizeInvoiceLineItems keeps editable direct amounts and filters empty rows", () => {
  const items = normalizeInvoiceLineItems([
    { id: "1", category: "人工代", description: "配線工事", quantity: 2, unit: "人工", unitPrice: 25000, amount: 50000 },
    { id: "2", category: "材料費", description: "", quantity: null, unit: "式", unitPrice: null, amount: 0 },
    { id: "3", category: "値引き", description: "端数調整", quantity: null, unit: "式", unitPrice: null, amount: -1000 }
  ]);

  assert.equal(items.length, 2);
  assert.equal(items[0].amount, 50000);
  assert.equal(items[1].amount, -1000);
});

test("calculateInvoiceTotals sums line items and tax", () => {
  const totals = calculateInvoiceTotals([
    { id: "1", category: "人工代", description: "配線工事", quantity: 2, unit: "人工", unitPrice: 25000, amount: 50000 },
    { id: "2", category: "材料費", description: "材料", quantity: 1, unit: "式", unitPrice: 12000, amount: 12000 }
  ], 10);

  assert.deepEqual(totals, {
    subtotal: 62000,
    taxAmount: 6200,
    totalAmount: 68200
  });
});

test("normalizeInvoiceLineItems converts legacy invoices to one line and caps rows", () => {
  const legacy = normalizeInvoiceLineItems([], {
    workDescription: "既存請求",
    laborCount: 1,
    dailyRate: 25000,
    materialCost: 3000,
    otherCost: 2000,
    subtotal: 30000
  });
  const tooMany = normalizeInvoiceLineItems(Array.from({ length: 20 }, (_, index) => ({
    id: `line-${index}`,
    category: "その他",
    description: `明細${index}`,
    quantity: 1,
    unit: "式",
    unitPrice: 1000,
    amount: 1000
  })));

  assert.equal(legacy.length, 1);
  assert.equal(legacy[0].amount, 30000);
  assert.equal(tooMany.length, 15);
});
