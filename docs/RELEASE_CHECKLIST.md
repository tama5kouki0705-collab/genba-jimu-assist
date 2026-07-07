# 正式リリース前チェックリスト

## 1. Supabase本番

- `supabase/migrations/001_initial_schema.sql` が適用済みである。
- `supabase/migrations/002_commercial_foundation.sql` が適用済みである。
- `supabase/migrations/003_drop_receipt_ocr_raw_text.sql` を適用し、`receipts.ocr_raw_text` が存在しない。
- Storage bucket `genba-files` が private で作成済みである。
- Storage policy が本人の `{user_id}/...` 配下だけを許可している。
- Table Editorで `receipts` に OCR全文保存用の値が入らないことを確認する。
- Authentication > URL Configuration の Site URL が `https://genba-jimu-assist.vercel.app` である。
- Authentication > URL Configuration の Redirect URLs に `https://genba-jimu-assist.vercel.app` が含まれている。
- パスワード再設定メール、Googleログイン、メール確認後の戻り先が localhost ではなく `https://genba-jimu-assist.vercel.app` になることを本番で確認する。

## 2. Vercel本番

- Production / Preview / Development に `NEXT_PUBLIC_SUPABASE_URL` を設定済みである。
- Production / Preview / Development に `NEXT_PUBLIC_SUPABASE_ANON_KEY` を設定済みである。
- 環境変数変更後に本番を再デプロイ済みである。
- `https://genba-jimu-assist.vercel.app` でトップページ、利用規約、プライバシーポリシーが表示できる。

## 3. アカウントとRLS

- ユーザーAで新規登録できる。
- ユーザーAでログイン、ログアウト、再ログインできる。
- ユーザーAで日報、カレンダー予定、領収書を保存できる。
- ユーザーAで再ログイン後、保存データが復元される。
- ユーザーBでログインしてもユーザーAのデータが見えない。
- ユーザーBからユーザーAのStorage画像パスを直接参照しても見えない。

## 4. 領収書OCR

- スマホ実機で写真を選択し、「写真から読み取る」が動作する。
- OCR後に確認フォームが表示される。
- 日付、金額、店舗名、勘定科目、メモを修正して保存できる。
- 保存後、カレンダーと領収書一覧に反映される。
- `receipts` に保存されるのは日付、金額、店舗名、勘定科目、メモ、画像パス、OCR状態であり、OCR全文は保存されない。
- OCRが失敗した場合でも、手入力または写真だけ先に保存で業務を続けられる。

## 5. 自動確認

- `pnpm run test` が成功する。
- `pnpm exec tsc --noEmit` が成功する。
- `pnpm run build` が成功する。
- `pnpm run check` が成功する。

## 6. リリース判定

- 主要導線をスマホ幅で確認済みである。
- 領収書画像、日報、カレンダー予定の保存と復元を確認済みである。
- 利用規約とプライバシーポリシーの文面が現在の保存仕様と一致している。
- 重大な既知不具合がない。
