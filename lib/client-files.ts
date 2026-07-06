"use client";

import { isAllowedImageFile, MAX_IMAGE_BYTES } from "./security.ts";

export async function fileToDataUrl(file: File | null) {
  if (!file) return "";
  if (!isAllowedImageFile(file)) {
    throw new Error(`画像は${Math.round(MAX_IMAGE_BYTES / 1024 / 1024)}MB以下の写真ファイルを選んでください`);
  }
  return new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.readAsDataURL(file);
  });
}

export function ensureImageFile(file: File | null) {
  if (!file || !file.size) return null;
  if (!isAllowedImageFile(file)) {
    throw new Error(`画像は${Math.round(MAX_IMAGE_BYTES / 1024 / 1024)}MB以下の写真ファイルを選んでください`);
  }
  return file;
}
