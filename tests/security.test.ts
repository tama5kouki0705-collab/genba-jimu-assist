import assert from "node:assert/strict";
import test from "node:test";
import { escapeHtml, isAllowedImageFile, normalizePdfRows, toSafeText } from "../lib/security.ts";

test("escapeHtml escapes executable HTML characters", () => {
  assert.equal(escapeHtml(`<script>alert("x")</script>`), "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;");
});

test("toSafeText removes control characters and trims long input", () => {
  assert.equal(toSafeText(" a\u0000b\u0007c ", 2), "ab");
});

test("normalizePdfRows limits row shape and count", () => {
  const rows = Array.from({ length: 100 }, (_, index) => [`項目${index}`, "x".repeat(3000)]);
  const normalized = normalizePdfRows(rows);
  assert.equal(normalized.length, 80);
  assert.equal(normalized[0][0], "項目0");
  assert.equal(normalized[0][1].length, 2000);
});

test("isAllowedImageFile accepts small image files only", () => {
  const image = new File(["ok"], "receipt.png", { type: "image/png" });
  const text = new File(["no"], "memo.txt", { type: "text/plain" });
  const hugeImage = new File([new Uint8Array(8 * 1024 * 1024 + 1)], "huge.jpg", { type: "image/jpeg" });

  assert.equal(isAllowedImageFile(image), true);
  assert.equal(isAllowedImageFile(text), false);
  assert.equal(isAllowedImageFile(hugeImage), false);
});
