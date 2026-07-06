# 現場事務アシスト MVP

一人親方・建設職人向けのスマホ特化PWAです。Supabaseを設定するとメール/GoogleログインとDB/Storage運用に接続できます。未設定でもデモモードで主要画面、登録、PDF生成を確認できます。

## 起動

```bash
pnpm install
pnpm dev
```

## Supabase

1. `.env.example` を参考に `.env.local` を作成
2. `supabase/migrations/001_initial_schema.sql` をSupabase SQL Editorで実行
3. AuthenticationでEmail/PasswordとGoogle Providerを有効化
4. Storageに `receipts`, `qualifications`, `vehicles`, `documents` バケットを作成

## MVP範囲

- メール登録/ログイン、Googleログイン導線
- プロフィール、現場、領収書、請求書、見積書、資格証、車両
- PDF生成API
- 管理者画面、プラン変更UI
- PWA manifest/service worker
- Supabase DB/RLS設計
