# 段取　命　君 MVP

現場責任者・担当者向けのスマホ特化PWAです。Supabaseを設定するとメール/GoogleログインとDB/Storage運用に接続できます。未設定でもデモモードで主要画面、登録、PDF生成を確認できます。

## 起動

```bash
pnpm install
pnpm dev
```

## Supabase

1. `.env.example` を参考に `.env.local` を作成
2. `supabase/migrations/001_initial_schema.sql` から最新番号までをSupabase SQL Editorで順番に実行
3. AuthenticationでEmail/PasswordとGoogle Providerを有効化
4. Storageに非公開バケット `genba-files` を作成、または `002_commercial_foundation.sql` のバケット作成を適用

## デプロイ手順

日報v2.0の保存は `work_logs.trade`, `work_start_at`, `work_end_at` と `roster` を使います。

1. Preview / 本番Supabaseへ `supabase/migrations/008_voice_report_v2.sql` を先に適用
2. アプリをPreviewへデプロイ
3. Previewで日報の作業開始、保存、再ログイン後の復元を確認
4. 本番へデプロイ

`008_voice_report_v2.sql` にはロールバックSQLをコメントで明記しています。アプリ側は008未適用DBでも日報保存が止まらないよう、新列を除いた再保存フォールバックを持っていますが、日報v2.0の開始/終了時刻と業種を永続化するには008適用が必要です。

## MVP範囲

- メール登録/ログイン、Googleログイン導線
- プロフィール、現場、領収書、請求書、見積書、資格証、車両
- PDF生成API
- 管理者画面、プラン変更UI
- PWA manifest/service worker
- Supabase DB/RLS設計
