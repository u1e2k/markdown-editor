# Jade - セットアップガイド

## 前提条件

以下のツールがインストールされている必要があります:

- Docker & Docker Compose
- Bun (v1.0以上)
- Rust & wasm-pack (Wasmモジュールのビルド用)

**ツールのインストール方法**: [docs/INSTALL_TOOLS.md](./docs/INSTALL_TOOLS.md) を参照してください。

## セットアップ手順

### 自動セットアップ（推奨）

```bash
# リポジトリのクローン
git clone https://github.com/u1e2k/markdown-editor.git
cd markdown-editor

# 自動セットアップスクリプトの実行
# Rust, wasm-pack, Bun が未インストールの場合は自動インストールされます
./setup.sh
```

`setup.sh` は以下を自動で実行します:
- Rust と wasm-pack のインストール確認・自動インストール
- Bun のインストール確認・自動インストール
- Wasmモジュールのビルド
- Dockerサービスの起動
- サーバーとクライアントの依存パッケージインストール

### 手動セットアップ

自動セットアップがうまくいかない場合は、以下の手順で手動セットアップしてください。

### 1. リポジトリのクローン

```bash
git clone https://github.com/u1e2k/markdown-editor.git
cd markdown-editor
```

### 2. Wasmモジュールのビルド

```bash
cd wasm
wasm-pack build --target web
cd ..
```

### 3. サーバーのセットアップ

```bash
cd server
bun install
cd ..
```

### 4. クライアントのセットアップ

```bash
cd client
bun install
cd ..
```

### 5. Docker環境の起動

```bash
docker-compose up -d
```

これにより以下のサービスが起動します:
- MinIO (ポート 9000, 9001)
- DynamoDB Local (ポート 8000)
- Elasticsearch (ポート 9200)
- API サーバー (ポート 8080)

### 6. 開発サーバーの起動

別のターミナルで:

```bash
cd client
npm run dev
```

ブラウザで http://localhost:3000 にアクセスしてください。

## 開発モード

### クライアント開発

```bash
cd client
bun run dev
```

### サーバー開発

```bash
cd server
bun run dev
```

### Wasmモジュールの再ビルド

```bash
cd wasm
wasm-pack build --target web
```

## プロダクションビルド

### クライアント

```bash
cd client
bun run build
```

### サーバー

```bash
cd server
bun run build
bun start
```

## トラブルシューティング

### Dockerサービスが起動しない

```bash
docker-compose down
docker-compose up -d --force-recreate
```

### MinIOのアクセス権限エラー

MinIO Consoleにアクセス (http://localhost:9001):
- ユーザー名: minioadmin
- パスワード: minioadmin

### Elasticsearchのメモリエラー

docker-compose.ymlの`ES_JAVA_OPTS`を調整してください。

## 次のステップ

- [使用方法](./USAGE.md)
- [アーキテクチャドキュメント](./ARCHITECTURE.md)
- [API仕様](./API.md)
