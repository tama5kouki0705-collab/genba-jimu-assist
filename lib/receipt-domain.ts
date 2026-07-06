import type { Receipt } from "@/lib/types";

export function receiptStatusLabel(status: Receipt["status"]) {
  return status === "処理済み" ? "経費にした" : "まだ経費にしてない";
}
