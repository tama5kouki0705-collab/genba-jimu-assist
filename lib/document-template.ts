export function moneyRows(values: Record<string, string>) {
  if (values["書類種別"] === "請求書") {
    return [
      ["人工費", values["人工数"] || "-", "人工", values["人工単価"] || "-", values["人工費"] || "-"],
      ["材料費", "1", "式", values["材料費"] || "-", values["材料費"] || "-"],
      ["その他費用", "1", "式", values["その他費用"] || "-", values["その他費用"] || "-"]
    ].filter((row) => row[4] !== "￥0" && row[4] !== "¥0");
  }
  return [[values["作業内容"] || "工事一式", values["数量"] || "1", values["単位"] || "式", values["単価"] || "-", values["小計"] || "-"]];
}
