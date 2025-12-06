#!/bin/bash

echo "🚀 Starting Jade development environment..."

# Rustのチェックとインストール
echo "🔍 Checking Rust installation..."
if ! command -v rustc &> /dev/null; then
    echo "📥 Rust not found. Installing Rust..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source "$HOME/.cargo/env"
    echo "✅ Rust installed successfully"
else
    echo "✅ Rust is already installed ($(rustc --version))"
fi

# wasm-packのチェックとインストール
echo "🔍 Checking wasm-pack installation..."
if ! command -v wasm-pack &> /dev/null; then
    echo "📥 wasm-pack not found. Installing wasm-pack..."
    curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh
    echo "✅ wasm-pack installed successfully"
else
    echo "✅ wasm-pack is already installed ($(wasm-pack --version))"
fi

# Wasmモジュールのビルド
echo "📦 Building Wasm module..."
cd wasm
wasm-pack build --target web
cd ..

# Bunのチェックとインストール
echo "🔍 Checking Bun installation..."
if ! command -v bun &> /dev/null; then
    echo "📥 Bun not found. Installing Bun..."
    curl -fsSL https://bun.sh/install | bash
    export BUN_INSTALL="$HOME/.bun"
    export PATH="$BUN_INSTALL/bin:$PATH"
    echo "✅ Bun installed successfully"
else
    echo "✅ Bun is already installed ($(bun --version))"
fi

# Dockerサービスの起動
echo "🐳 Starting Docker services..."
docker-compose up -d

# サービスの起動を待つ
echo "⏳ Waiting for services to be ready..."
sleep 10

# サーバーの依存関係インストール
echo "📦 Installing server dependencies..."
cd server
bun install
cd ..

# クライアントの依存関係インストール
echo "📦 Installing client dependencies..."
cd client
bun install
cd ..

echo "✅ Setup complete!"
echo ""
echo "To start the application:"
echo "  1. Start the API server: cd server && bun run dev"
echo "  2. Start the client: cd client && bun run dev"
echo "  3. Open http://localhost:3000 in your browser"
echo ""
echo "Services:"
echo "  - Client: http://localhost:3000"
echo "  - API: http://localhost:8080"
echo "  - MinIO Console: http://localhost:9001"
echo "  - DynamoDB: http://localhost:8000"
echo "  - Elasticsearch: http://localhost:9200"
