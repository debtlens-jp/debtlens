# DebtLens 公開・収益化 完全ガイド

## 目次

1. [公開前チェック](#1-公開前チェック)
2. [GitHub Pages 公開](#2-github-pages-公開)
3. [独自ドメイン設定](#3-独自ドメイン設定)
4. [Google Search Console](#4-google-search-console)
5. [Google Analytics](#5-google-analytics)
6. [AdSense 申請](#6-adsense-申請)
7. [ASP 登録・アフィリエイト](#7-asp-登録アフィリエイト)
8. [ニュース自動取得の有効化](#8-ニュース自動取得の有効化)
9. [金利データ更新フロー](#9-金利データ更新フロー)
10. [公開後チェックリスト](#10-公開後チェックリスト)

---

## 1. 公開前チェック

### 個人情報の差し替え（必須）

以下のファイルにプレースホルダーがあります。**必ず差し替えてから公開してください。**

| ファイル | 差し替え箇所 |
|---------|-------------|
| `about.html` | `[あなたの名前またはハンドルネーム]`、`[メールアドレス]`、`[アカウントURL]` |
| `privacy.html` | `[あなたの名前またはハンドルネーム]`、`[メールアドレス]` |
| `js/consent.js` | `ca-pub-XXXXXXXXXX`（AdSense ID）、`G-XXXXXXXXXX`（GA4 ID） |

### URL の差し替え

以下のファイルで `yourdomain.com` を独自ドメインに変更してください。

- 全 HTML ファイルの `<link rel="canonical">`
- `sitemap.xml` の全 `<loc>`
- `robots.txt` の `Sitemap:`

### ローカル確認

```bash
# Node.js がある場合
npx serve .

# Python がある場合
python -m http.server 8000

# VS Code の場合
# Live Server 拡張機能を使用
```

ブラウザで `http://localhost:8000` を開き、以下を確認：

- [ ] 5タブすべての計算が動作する
- [ ] 会社名検索で金利が自動入力される
- [ ] スライダーと数値入力が同期する
- [ ] 全ページのリンクが正しく遷移する
- [ ] モバイル表示が崩れていない
- [ ] Cookie同意バナーが表示される

---

## 2. GitHub Pages 公開

### 手順

1. GitHub で新しいリポジトリを作成（例: `debtlens`）
2. リポジトリ設定で **Public** を選択
3. 全ファイルをアップロード（ドラッグ&ドロップ or git push）
4. Settings → Pages → Source: `Deploy from a branch`
5. Branch: `main` / `/ (root)` を選択 → Save
6. 数分待つと `https://ユーザー名.github.io/debtlens/` で公開される

### git でアップロードする場合

```bash
cd debtlens
git init
git add .
git commit -m "Initial release"
git remote add origin https://github.com/ユーザー名/debtlens.git
git branch -M main
git push -u origin main
```

---

## 3. 独自ドメイン設定

### ドメイン取得

おすすめのドメインレジストラ：
- Google Domains（安定・管理しやすい）
- Cloudflare Registrar（原価提供で安い）
- ムームードメイン（日本語対応）

`.com` や `.jp` が理想。年間1,000〜3,000円程度。

### DNS 設定

GitHub Pages のIPアドレスを A レコードに設定：

```
185.199.108.153
185.199.109.153
185.199.110.153
185.199.111.153
```

CNAME レコード（www サブドメイン）：
```
www → ユーザー名.github.io
```

### GitHub 側の設定

1. リポジトリのルートに `CNAME` ファイルを作成
   ```
   yourdomain.com
   ```
2. Settings → Pages → Custom domain に `yourdomain.com` を入力
3. 「Enforce HTTPS」にチェック（DNS 反映後に有効化）

DNS 反映には最大48時間かかることがあります。

---

## 4. Google Search Console

1. [Google Search Console](https://search.google.com/search-console/) にアクセス
2. 「プロパティを追加」→ ドメインまたは URL プレフィックスを選択
3. 所有権を確認（DNS TXT レコード or HTML ファイルアップロード）
4. サイトマップを送信：`https://yourdomain.com/sitemap.xml`
5. 「URL 検査」で主要ページのインデックス登録をリクエスト

### 優先的にインデックスリクエストするページ

1. `index.html`（トップ）
2. `glossary.html`（用語集）
3. `columns/ribo-shikumi.html`（リボの仕組み）
4. `columns/bnpl-chuiten.html`（BNPL注意点）

---

## 5. Google Analytics

1. [Google Analytics](https://analytics.google.com/) で GA4 プロパティを作成
2. 測定 ID（`G-XXXXXXXXXX`）を取得
3. `js/consent.js` の `GA_ID` を差し替え
4. Cookie 同意バナーで「同意する」を選んだユーザーのみトラッキングが有効化される

### 確認すべき指標

- ページビュー（どのタブ・コラムが人気か）
- 直帰率（計算ツールが使われているか）
- 流入元（検索 or SNS or 直接）
- デバイス比率（モバイル vs PC）

---

## 6. AdSense 申請

### 申請タイミング

公開から **2週間後** を推奨。理由：
- Search Console にインデックスが反映される
- ある程度のページビューが蓄積される
- Google がサイトの品質を評価できる

### 審査通過のポイント

DebtLens は以下の審査要件を満たす設計です：

- [x] プライバシーポリシー（`privacy.html`）
- [x] 運営者情報（`about.html`）
- [x] オリジナルコンテンツ（コラム6本＋用語集＋ガイド＋シミュレーション例）
- [x] 合計オリジナルテキスト量：約 45,000字以上
- [x] サイトナビゲーション（全ページ相互リンク）
- [x] モバイル対応（レスポンシブデザイン）

### 申請手順

1. [Google AdSense](https://www.google.com/adsense/) にアクセス
2. サイトの URL を登録
3. AdSense コード（`ca-pub-XXXXXXXXXX`）を取得
4. `js/consent.js` の `ADSENSE_ID` を差し替え
5. 審査完了を待つ（通常1〜2週間）

---

## 7. ASP 登録・アフィリエイト

### 登録するASP

| ASP | URL | 特徴 |
|-----|-----|------|
| A8.net | https://www.a8.net/ | 案件数最多、審査なし |
| バリューコマース | https://www.valuecommerce.ne.jp/ | Yahoo!系案件に強い |

### 案件選定方針

**初期は「FP無料相談」「家計見直し」系の案件を推奨。**

債務整理系の案件は弁護士法72条（非弁行為の禁止）との関係で注意が必要なため、当面は回避してください。

### CTA の設置

1. ASP で案件を検索 → 提携申請
2. アフィリエイトリンクを取得
3. 各ページの CTA ブロックのリンクを差し替え
4. CTA の上に「【広告】」表記を追加
5. リンクに `rel="sponsored"` を設定

---

## 8. ニュース自動取得の有効化

### 初回実行

1. GitHub リポジトリの Actions タブを開く
2. 「Fetch Financial News」ワークフローを選択
3. 「Run workflow」で手動実行
4. `data/news.json` が生成されることを確認

### 自動実行

`fetch-news.yml` により毎日 9:00 JST（0:00 UTC）に自動実行されます。
GitHub Actions の無料枠（月2,000分）で十分収まります。

---

## 9. 金利データ更新フロー

### 自動リマインダー

`rate-reminder.yml` により毎月1日に GitHub Issue が自動作成されます。
Issue には50社の公式サイト URL とチェックリストが含まれています。

### 更新手順

1. Issue のチェックリストに従って各社の公式サイトを確認
2. 変更があった場合は `data/rates.json` を更新
3. `lastUpdated` の日付を更新
4. コミット&プッシュ

### 90日警告

`js/app.js` が `data/rates.json` の `lastUpdated` をチェックし、90日以上経過している場合はページ上部に警告バナーを表示します。

---

## 10. 公開後チェックリスト

### 即時（公開直後）

- [ ] サイトが正常に表示される
- [ ] HTTPS が有効になっている
- [ ] 全ページのリンクが動作する
- [ ] モバイルで表示を確認

### 1週間後

- [ ] Search Console でインデックス状況を確認
- [ ] エラーページがないことを確認
- [ ] X（Twitter）で公開告知

### 2週間後

- [ ] AdSense 申請
- [ ] Analytics でアクセス状況を確認

### 1ヶ月後

- [ ] ASP 登録・案件提携
- [ ] CTA リンク差し替え
- [ ] 金利データ更新チェック（Issue 確認）

### 3ヶ月後

- [ ] Analytics 分析 → 人気ページの特定
- [ ] SEO 記事追加検討
- [ ] AdSense 収益確認
- [ ] アフィリエイト成果確認
