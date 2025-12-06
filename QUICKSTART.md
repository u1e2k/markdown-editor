# 🚀 クイックスタートガイド

## 最も簡単な起動方法（推奨）

### ワンコマンドで全て起動

```bash
# プロジェクトルートで実行
chmod +x start.sh
./start.sh
```

または直接Docker Composeを使用:

```bash
docker compose up -d --build
```

これで以下がすべて起動します:
- ✅ MinIO (S3互換ストレージ)
- ✅ DynamoDB Local (メタデータDB)
- ✅ Elasticsearch (全文検索)
- ✅ APIサーバー (ポート8080)
- ✅ クライアント (ポート3000)

### アクセス

http://localhost:3000 をブラウザで開く

---

## 問題が発生した場合

### エラー: `ECONNREFUSED` (ノート追加時)

**解決方法:**

```bash
# すべてのサービスを再起動
docker compose down
docker compose up -d --build

# ログを確認
docker compose logs -f api
docker compose logs -f client
```

### サービスの状態確認

```bash
docker compose ps
```

すべてのサービスが `Up` 状態であることを確認してください。

---

## 開発モードでの起動（ローカル環境）

Docker を使わずローカルで開発する場合:

**ステップ1: Dockerサービスのみ起動**
```bash
docker compose up -d minio dynamodb elasticsearch
```

**ステップ2: サーバーをローカルで起動**
```bash
cd server
bun install
bun run dev
```

**ステップ3: クライアントをローカルで起動**
```bash
cd client
bun install
bun run dev
```

注意: ローカルモードの場合、`client/vite.config.ts`のプロキシ設定を以下に変更:
```typescript
proxy: {
  '/api': {
    target: 'http://localhost:8080',
    changeOrigin: true,
  },
}
```

---

## よくあるコマンド

### ログの確認
```bash
# すべてのサービス
docker compose logs -f

# 特定のサービス
docker compose logs -f api
docker compose logs -f client
docker compose logs -f minio
```

### サービスの再起動
```bash
# すべて
docker compose restart

# 特定のサービス
docker compose restart api
docker compose restart client
```

### サービスの停止
```bash
docker compose down

# ボリュームも削除（完全クリーンアップ）
docker compose down -v
```

### コンテナ内でコマンド実行
```bash
# APIサーバーコンテナ内
docker compose exec api sh

# クライアントコンテナ内
docker compose exec client sh
```

---

## サービスURL

- **クライアント**: http://localhost:3000
- **APIサーバー**: http://localhost:8080
- **MinIOコンソール**: http://localhost:9001 (minioadmin/minioadmin)
- **Elasticsearch**: http://localhost:9200
- **DynamoDB Local**: http://localhost:8000

---

## トラブルシューティング

### ポートが既に使用されている

```bash
# 使用中のポートを確認
lsof -i :3000
lsof -i :8080

# または
docker compose down
```

### ビルドエラーが発生

```bash
# キャッシュをクリアして再ビルド
docker compose build --no-cache
docker compose up -d
```

### データをリセットしたい

```bash
# すべてのボリュームを削除
docker compose down -v
docker compose up -d --build
```
