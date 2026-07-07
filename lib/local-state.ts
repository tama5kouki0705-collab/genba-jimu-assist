"use client";

import { useEffect, useState } from "react";

export const STORAGE_ERROR_EVENT = "genba-storage-error";
export const STORAGE_LIMIT_MESSAGE = "画像サイズが大きすぎます。枚数を減らすか、画像を小さくしてください";
const STORAGE_LOAD_ERROR_MESSAGE = "保存データを読み込めませんでした。アプリは初期状態で起動しました";

export type LocalAccount = {
  email: string;
  password?: string;
  passwordHash?: string;
  createdAt: string;
};

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function accountKey(email: string) {
  return normalizeEmail(email).replace(/[^a-z0-9@._-]/g, "_") || "signed-out";
}

function notifyStorageError(message: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(STORAGE_ERROR_EVENT, { detail: message }));
}

function getLocalStorageItem(key: string) {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(key);
  } catch {
    notifyStorageError(STORAGE_LOAD_ERROR_MESSAGE);
    return null;
  }
}

function parseStoredValue<T>(raw: string | null, initial: T) {
  if (!raw) return initial;
  try {
    return JSON.parse(raw) as T;
  } catch {
    notifyStorageError(STORAGE_LOAD_ERROR_MESSAGE);
    return initial;
  }
}

export function setLocalStorageItem(key: string, value: string) {
  if (typeof window === "undefined") return false;
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    notifyStorageError(STORAGE_LIMIT_MESSAGE);
    return false;
  }
}

export function useStoredState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [loadedKey, setLoadedKey] = useState("");

  useEffect(() => {
    setValue(parseStoredValue(getLocalStorageItem(key), initial));
    setLoadedKey(key);
  }, [key]);

  useEffect(() => {
    if (loadedKey !== key) return;
    setLocalStorageItem(key, JSON.stringify(value));
  }, [key, loadedKey, value]);

  return [value, setValue] as const;
}

export function getLocalAccounts() {
  return parseStoredValue<LocalAccount[]>(getLocalStorageItem("genba:local-accounts"), []);
}

export function saveLocalAccounts(accounts: LocalAccount[]) {
  return setLocalStorageItem("genba:local-accounts", JSON.stringify(accounts));
}

export async function hashPassword(value: string) {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
