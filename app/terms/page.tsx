export default function TermsPage() {
  return (
    <main className="mx-auto min-h-screen max-w-3xl bg-[#f7fbff] px-5 py-8 text-ink">
      <a className="text-sm font-bold text-genba underline" href="/">段取　命　君に戻る</a>
      <h1 className="mt-6 text-3xl font-black">利用規約</h1>
      <p className="mt-3 text-sm leading-7 text-slate-600">この利用規約は、段取　命　君を安心して使うための基本的な約束です。</p>

      <section className="mt-8 grid gap-5 text-sm leading-7">
        <div>
          <h2 className="text-lg font-black">1. サービス内容</h2>
          <p className="mt-2">本サービスは、現場責任者や担当者のために、担当現場の日報、カレンダー、領収書、請求書などの記録整理と会社共有を補助します。</p>
        </div>
        <div>
          <h2 className="text-lg font-black">2. アカウント管理</h2>
          <p className="mt-2">利用者は、自分のメールアドレスとパスワードを適切に管理してください。第三者に使わせないでください。</p>
        </div>
        <div>
          <h2 className="text-lg font-black">3. 保存データ</h2>
          <p className="mt-2">入力した日報、予定、領収書画像、保存項目などは、担当現場の業務管理と会社共有のために保存されます。</p>
        </div>
        <div>
          <h2 className="text-lg font-black">4. 禁止事項</h2>
          <p className="mt-2">不正アクセス、他人のデータ閲覧、法令に反する利用、サービス運営を妨げる行為は禁止します。</p>
        </div>
        <div>
          <h2 className="text-lg font-black">5. 免責</h2>
          <p className="mt-2">本サービスは事務作業を補助するものであり、税務、法務、会計上の最終判断は利用者自身の責任で行ってください。</p>
        </div>
        <div>
          <h2 className="text-lg font-black">6. 規約変更</h2>
          <p className="mt-2">必要に応じて本規約を変更することがあります。重要な変更は、サービス上で分かりやすく案内します。</p>
        </div>
      </section>
    </main>
  );
}
