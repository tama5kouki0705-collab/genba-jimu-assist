export const MAX_TEXT_LENGTH = 500;
export const MAX_LONG_TEXT_LENGTH = 2000;
export const MAX_PDF_ROWS = 80;
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export function toSafeText(value: unknown, maxLength = MAX_TEXT_LENGTH) {
  return String(value ?? "")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .trim()
    .slice(0, maxLength);
}

export function escapeHtml(value: unknown) {
  return toSafeText(value, MAX_LONG_TEXT_LENGTH)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function normalizePdfRows(rows: unknown) {
  if (!Array.isArray(rows)) return [];
  return rows.slice(0, MAX_PDF_ROWS).map((row) => {
    if (!Array.isArray(row)) return ["", ""] as [string, string];
    return [toSafeText(row[0], 80), toSafeText(row[1], MAX_LONG_TEXT_LENGTH)] as [string, string];
  });
}

export function isAllowedImageFile(file: File | null) {
  if (!file) return false;
  return file.size > 0 && file.size <= MAX_IMAGE_BYTES && file.type.startsWith("image/");
}
