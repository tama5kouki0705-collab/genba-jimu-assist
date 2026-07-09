import type { WorkLog } from "./types";

export type TradeDetailValue = string | string[] | boolean | number | null;
export type TradeDetails = Record<string, TradeDetailValue>;
export type TradeName = "解体" | "内装" | "リフォーム" | "その他";

export type TradeReportField = {
  id: string;
  type: "check" | "select" | "number" | "text" | "toggle-text";
  label: string;
  options?: string[];
  placeholder?: string;
};

export type TradeReportConfig = {
  trade: TradeName;
  title: string;
  note?: string;
  fields: TradeReportField[];
};

export const tradeOptions: TradeName[] = ["解体", "内装", "リフォーム", "その他"];
const machineOptions = ["2t車", "4t車", "ユニック", "高所作業車", "ユンボ", "ブレーカー", "その他"];

export const tradeReportConfigs: TradeReportConfig[] = [
  {
    trade: "解体",
    title: "解体の記録",
    note: "マニフェスト伝票は下の現場写真に撮っておくと安心です",
    fields: [
      { id: "dischargeItems", type: "check", label: "搬出したもの", options: ["木くず", "ガラ", "金属", "混合", "石膏ボード"] },
      { id: "truckCount", type: "number", label: "トラック何台？", placeholder: "例：3" },
      { id: "machines", type: "check", label: "使った重機・車両", options: machineOptions },
      { id: "neighborNote", type: "text", label: "近隣であったこと", placeholder: "例：東側のお宅に挨拶済み" }
    ]
  },
  {
    trade: "内装",
    title: "内装の記録",
    fields: [
      { id: "finishes", type: "check", label: "今日やった仕上げ", options: ["ボード", "パテ", "クロス", "床", "巾木"] },
      { id: "machines", type: "check", label: "使った重機・車両", options: machineOptions },
      { id: "quantity", type: "text", label: "今日の数量（ざっくり）", placeholder: "例：35m2、12枚" },
      { id: "baseCondition", type: "select", label: "下地はどうだった？", options: ["良好", "要補修", "補修して施工"] },
      { id: "materialNote", type: "text", label: "足りない物・余った物" }
    ]
  },
  {
    trade: "リフォーム",
    title: "リフォームの記録",
    fields: [
      { id: "workTypes", type: "check", label: "今日やった工事", options: ["解体", "大工", "設備", "内装", "その他"] },
      { id: "machines", type: "check", label: "使った重機・車両", options: machineOptions },
      { id: "clientNote", type: "text", label: "お施主さんと話したこと", placeholder: "例：色は白系で決定" },
      { id: "extraWork", type: "toggle-text", label: "追加の仕事が発生した", placeholder: "例：洗面の床も張り替えることに" }
    ]
  },
  {
    trade: "その他",
    title: "その他の記録",
    fields: [
      { id: "machines", type: "check", label: "使った重機・車両", options: machineOptions },
      { id: "otherWork", type: "text", label: "作業の内容", placeholder: "例：清掃、搬入、立ち会いなど" }
    ]
  }
];

export function normalizeTrade(trade: string | null | undefined): TradeName {
  const trimmed = (trade || "").trim();
  return tradeOptions.includes(trimmed as TradeName) ? trimmed as TradeName : "その他";
}

export function getTradeReportConfig(trade: string | null | undefined) {
  const normalized = normalizeTrade(trade);
  return tradeReportConfigs.find((config) => config.trade === normalized);
}

export function compactTradeDetails(config: TradeReportConfig | undefined, details: TradeDetails): TradeDetails | null {
  if (!config) return null;
  const compacted = config.fields.reduce<TradeDetails>((next, field) => {
    const value = details[field.id];
    if (field.type === "check") {
      const values = Array.isArray(value) ? value.filter(Boolean) : [];
      if (values.length) next[field.id] = values;
      return next;
    }
    if (field.type === "number") {
      if (value === "" || value === null || value === undefined) return next;
      const numberValue = Number(value);
      if (Number.isFinite(numberValue)) next[field.id] = numberValue;
      return next;
    }
    if (field.type === "toggle-text") {
      if (value === true) next[field.id] = true;
      if (typeof value === "string" && value.trim()) next[field.id] = value.trim();
      return next;
    }
    if (typeof value === "string" && value.trim()) next[field.id] = value.trim();
    return next;
  }, {});
  return Object.keys(compacted).length ? compacted : null;
}

export function formatTradeDetails(config: TradeReportConfig | undefined, details: WorkLog["tradeDetails"]) {
  if (!config || !details) return [];
  return config.fields.flatMap((field) => {
    const value = details[field.id];
    if (Array.isArray(value) && value.length) return [[field.label, value.join("、")] as [string, string]];
    if (field.type === "toggle-text" && value === true) return [[field.label, "あり"] as [string, string]];
    if (typeof value === "number") return [[field.label, String(value)] as [string, string]];
    if (typeof value === "string" && value.trim()) return [[field.label, value] as [string, string]];
    return [];
  });
}
