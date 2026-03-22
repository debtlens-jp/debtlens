# DebtLens

**「数字は正直に、言葉は優しく」** ── リボ払い・分割払い・後払い(BNPL)の伴走型シミュレーター

## 概要

50社の金利に対応した無料シミュレーターです。完済期間・利息総額・繰上返済効果をブラウザ上で即座に計算できます。入力データはサーバーに送信されません。

## 機能

| タブ | 機能 |
|------|------|
| 🔄 リボ払い | 3方式対応（元利定額・元金定額・残高スライド）、逆算モード、繰上返済比較 |
| 📅 分割払い | 3〜36回の手数料一覧表示 |
| ⚖️ リボvs分割 | 同条件での並列コスト比較 |
| 📱 後払い(BNPL) | Paidy（6回・12回・翌月）、メルペイ定額 |
| 📊 複数借入 | 複数借入の合計管理・個別計算 |

## ファイル構成

```
debtlens/
├── index.html              # メインページ（シミュレーター）
├── guide.html              # 使い方ガイド
├── glossary.html           # 用語集（18語）
├── examples.html           # シミュレーション例（3シナリオ）
├── privacy.html            # プライバシーポリシー
├── about.html              # 運営者情報
├── trademarks.html         # 商標一覧
├── css/style.css           # 共通スタイルシート
├── js/
│   ├── app.js              # 計算エンジン・タブ制御
│   ├── consent.js          # Cookie同意バナー
│   └── news.js             # ニュースウィジェット
├── data/
│   ├── rates.json          # 50社金利データ
│   └── news.json           # ニュースデータ（GitHub Actions自動生成）
├── columns/
│   ├── ribo-shikumi.html   # コラム：リボ払いの仕組み
│   ├── ribo-vs-bunkatsu.html # コラム：リボvs分割の違い
│   ├── bnpl-chuiten.html   # コラム：BNPL注意点
│   ├── kuriage-hensai.html # コラム：繰上返済のコツ
│   ├── tasaju-saimu.html   # コラム：多重債務の返済戦略
│   └── credit-kihon.html   # コラム：クレジットカード金利の基本
├── sitemap.xml
├── robots.txt
├── DEPLOY_GUIDE.md         # 公開・収益化ガイド
├── README.md               # このファイル
└── .github/workflows/
    ├── rate-reminder.yml    # 月次金利更新リマインダー
    └── fetch-news.yml       # 毎日ニュース自動取得
```

## セットアップ

1. このリポジトリをクローンまたはダウンロード
2. `about.html` と `privacy.html` の `[あなたの名前]` `[メールアドレス]` を差し替え
3. `js/consent.js` の AdSense ID と GA4 ID を差し替え
4. `sitemap.xml` と各ページの canonical URL を独自ドメインに変更
5. ローカルで確認（`npx serve .` や Live Server 等）
6. GitHub Pages で公開

詳細は [DEPLOY_GUIDE.md](DEPLOY_GUIDE.md) を参照してください。

## 技術スタック

- HTML + CSS + JavaScript（フレームワークなし）
- 静的サイト（GitHub Pages対応）
- 外部ライブラリなし（Chart.js不使用、Canvas APIで描画）

## ライセンス

コンテンツの著作権はDebtLensプロジェクトに帰属します。個人利用・改変は自由です。

## 注意事項

本サイトは情報提供を目的としており金融アドバイスではありません。実際の金利・手数料は各社の規約をご確認ください。
