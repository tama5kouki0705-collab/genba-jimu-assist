"use client";

import { isAllowedImageFile, MAX_IMAGE_BYTES } from "./security.ts";

const LOCAL_IMAGE_MAX_SIDE = 1280;
const LOCAL_IMAGE_QUALITY = 0.8;

async function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("画像を読み込めませんでした。もう一度選び直してください"));
    reader.readAsDataURL(file);
  });
}

async function imageToCompressedDataUrl(file: File) {
  if (typeof document === "undefined" || typeof createImageBitmap === "undefined") {
    return readFileAsDataUrl(file);
  }

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, LOCAL_IMAGE_MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      bitmap.close();
      return readFileAsDataUrl(file);
    }

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    return canvas.toDataURL("image/jpeg", LOCAL_IMAGE_QUALITY);
  } catch {
    return readFileAsDataUrl(file);
  }
}

export async function fileToDataUrl(file: File | null) {
  if (!file) return "";
  if (!isAllowedImageFile(file)) {
    throw new Error(`画像サイズが大きすぎます。枚数を減らすか、画像を小さくしてください（${Math.round(MAX_IMAGE_BYTES / 1024 / 1024)}MB以下）`);
  }
  return imageToCompressedDataUrl(file);
}

export function ensureImageFile(file: File | null) {
  if (!file || !file.size) return null;
  if (!isAllowedImageFile(file)) {
    throw new Error(`画像サイズが大きすぎます。枚数を減らすか、画像を小さくしてください（${Math.round(MAX_IMAGE_BYTES / 1024 / 1024)}MB以下）`);
  }
  return file;
}
