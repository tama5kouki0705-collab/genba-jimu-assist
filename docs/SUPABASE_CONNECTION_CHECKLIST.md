# Supabase接続準備チェック

## 1. ローカルに入れる環境変数

プロジェクト直下の `.env.local` に、Supabase管理画面の Project Settings > API から取得した値を貼る。

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

貼り付け後は開発サーバーを再起動する。

## 2. Supabase SQL Editorで実行するSQL

まず `supabase/migrations/001_initial_schema.sql` が未適用なら先に実行する。

その後、以下をSupabase SQL Editorに貼って実行する。

`docs/SUPABASE_SQL_EDITOR_002_COMMERCIAL_FOUNDATION.sql`

このSQLで追加される主な土台:

- `work_logs`
- `calendar_schedules`
- `receipts.image_path`
- `receipts.ocr_status`
- Storage bucket `genba-files`
- Storageの本人限定policy
- 課金拡張用の `subscription_status`, `trial_ends_at`, `current_period_ends_at`

## 3. Supabase保存に切り替わったかの確認

`.env.local` に値を入れて開発サーバーを再起動した後、画面上部の保存状態が以下に変わることを確認する。

- 未ログイン時: `ログイン後に同期`
- ログイン後: `Supabase同期中` から `Supabase同期済み`

確認する保存先:

- 日報を保存したら Supabase Table Editor > `work_logs` に行が増える
- カレンダー予定を保存したら `calendar_schedules` に行が増える
- 領収書を保存したら `receipts` に行が増え、`image_path` と保存項目（日付・金額・支払先・用途・メモ・状態）が入る
- 領収書写真を保存したら Storage > `genba-files` > `{user_id}/receipts/` に画像が入る

## 4. Vercelに入れる環境変数

Vercelの Project Settings > Environment Variables に以下を入れる。

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

入れる対象:

- Production
- Preview
- Development

Vercelに入れた後は再デプロイする。

## 5. 本番化前の最低限確認

- ユーザーAで登録、日報、カレンダー予定、領収書を保存できる
- ユーザーAでログアウト後、再ログインしてデータが戻る
- ユーザーBでログインして、ユーザーAのデータが見えない
- ユーザーBからユーザーAのStorage画像パスを直接参照しても見えない
- Vercel公開URLでも同じ結果になる
