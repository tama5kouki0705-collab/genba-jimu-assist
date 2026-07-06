import { NextRequest, NextResponse } from "next/server";
import { jsPDF } from "jspdf";
import { MAX_LONG_TEXT_LENGTH, normalizePdfRows, toSafeText } from "@/lib/security";

type PdfBody = {
  title: string;
  rows: Array<[string, string]>;
  note?: string;
};

export async function POST(request: NextRequest) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 64 * 1024) {
    return NextResponse.json({ error: "PDF input is too large" }, { status: 413 });
  }

  let body: PdfBody;
  try {
    body = (await request.json()) as PdfBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const title = toSafeText(body.title || "Document", 80);
  const rows = normalizePdfRows(body.rows);
  const note = toSafeText(body.note || "", MAX_LONG_TEXT_LENGTH);
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text(title, 18, 24);
  doc.setDrawColor(15, 103, 177);
  doc.setLineWidth(0.8);
  doc.line(18, 31, 192, 31);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  let y = 44;
  rows.forEach(([label, value]) => {
    if (y > 270) {
      doc.addPage();
      y = 24;
    }
    doc.setTextColor(86, 101, 118);
    doc.text(label, 18, y);
    doc.setTextColor(20, 32, 51);
    doc.text(String(value || "-"), 70, y);
    y += 9;
  });

  if (note) {
    y += 8;
    doc.setTextColor(86, 101, 118);
    doc.text("Note", 18, y);
    doc.setTextColor(20, 32, 51);
    doc.text(doc.splitTextToSize(note, 120), 70, y);
  }

  const buffer = Buffer.from(doc.output("arraybuffer"));
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(title || "document")}.pdf"`
    }
  });
}
