"use client";

import { useEffect, useRef, useState } from "react";

export default function PrintPage() {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [html, setHtml] = useState("");

  useEffect(() => {
    setHtml(localStorage.getItem("genba:print-html") || "");
  }, []);

  function printDocument() {
    frameRef.current?.contentWindow?.focus();
    frameRef.current?.contentWindow?.print();
  }

  return (
    <main className="min-h-screen bg-[#eef3f8]">
      <div className="sticky top-0 z-10 flex gap-2 bg-genba p-3">
        <button onClick={() => history.back()} className="tap flex-1 rounded-lg bg-white px-4 py-3 font-bold text-genba">戻る</button>
        <button onClick={printDocument} className="tap flex-1 rounded-lg bg-ink px-4 py-3 font-bold text-white">印刷・PDF保存</button>
      </div>
      {html ? (
        <iframe
          ref={frameRef}
          title="帳票プレビュー"
          srcDoc={html}
          sandbox="allow-modals"
          className="h-[calc(100vh-68px)] w-full border-0"
        />
      ) : (
        <div className="mx-auto max-w-md p-5">
          <section className="rounded-lg border border-line bg-white p-4 shadow-soft">
            <h1 className="text-xl font-bold">帳票データがありません</h1>
            <p className="mt-2 text-sm text-slate-600">請求書、見積書、各種一覧の画面から、もう一度PDFボタンを押してください。</p>
          </section>
        </div>
      )}
    </main>
  );
}
