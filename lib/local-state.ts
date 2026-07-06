"use client";

import { useEffect, useState } from "react";

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

export function useStoredState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [loadedKey, setLoadedKey] = useState("");

  useEffect(() => {
    const raw = localStorage.getItem(key);
    setValue(raw ? (JSON.parse(raw) as T) : initial);
    setLoadedKey(key);
  }, [key]);

  useEffect(() => {
    if (loadedKey !== key) return;
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, loadedKey, value]);

  return [value, setValue] as const;
}

export function getLocalAccounts() {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem("genba:local-accounts");
  return raw ? (JSON.parse(raw) as LocalAccount[]) : [];
}

export function saveLocalAccounts(accounts: LocalAccount[]) {
  localStorage.setItem("genba:local-accounts", JSON.stringify(accounts));
}

export async function hashPassword(value: string) {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
