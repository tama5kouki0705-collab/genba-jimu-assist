export default function PrivacyPage() {
  return (
    <main className="mx-auto min-h-screen max-w-3xl bg-[#f7fbff] px-5 py-8 text-ink">
      <a className="text-sm font-bold text-genba underline" href="/">段取　命　君に戻る</a>
      <h1 className="mt-6 text-3xl font-black">プライバシーポリシー</h1>
      <p className="mt-3 text-sm leading-7 text-slate-600">段取　命　君は、担当現場の業務データを大切に扱います。</p>

      <section className="mt-8 grid gap-5 text-sm leading-7">
        <div>
          <h2 className="text-lg font-black">1. 取得する情報</h2>
          <p className="mt-2">メールアドレス、プロフィール情報（氏名・会社名・連絡先など）、日報、カレンダー予定、領収書画像と入力内容、写真メモ、現場情報を取得します。</p>
        </div>
        <div>
          <h2 className="text-lg font-black">2. 利用目的</h2>
          <p className="mt-2">取得した情報は、業務記録、予定管理、領収書管理、写真メモ管理、会社共有など、サービス提供のために利用します。</p>
        </div>
        <div>
          <h2 className="text-lg font-black">3. データの保護</h2>
          <p className="mt-2">ユーザーごとにデータを分離し、本人以外が閲覧できないようにアクセス制御を行います。</p>
        </div>
        <div>
          <h2 className="text-lg font-black">4. 画像ファイル</h2>
          <p className="mt-2">領収書画像などのファイルは、本人のアカウントに紐づく非公開ストレージに保存します。</p>
        </div>
        <div>
          <h2 className="text-lg font-black">5. 領収書情報</h2>
          <p className="mt-2">領収書では、画像、日付、金額、名目、メモなど、確認後に保存する項目を扱います。</p>
        </div>
        <div>
          <h2 className="text-lg font-black">6. 共有機能</h2>
          <p className="mt-2">共有機能を使った場合、利用者自身が選んだ内容だけが、利用者の操作で選んだ相手（会社・事務担当など）に送られます。サービスが自動で第三者に送ることはありません。</p>
        </div>
        <div>
          <h2 className="text-lg font-black">7. 第三者提供</h2>
          <p className="mt-2">法令に基づく場合を除き、利用者の同意なく第三者へ個人情報を提供しません。</p>
        </div>
        <div>
          <h2 className="text-lg font-black">8. 問い合わせ</h2>
          <p className="mt-2">個人情報の確認、修正、削除に関する相談は、サービス運営者へお問い合わせください。</p>
        </div>
      </section>
    </main>
  );
}
