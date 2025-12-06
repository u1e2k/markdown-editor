#!/bin/bash

# Jadeアプリケーションの起動スクリプト

echo "🚀 Starting Jade Markdown Editor..."
echo ""

# 既存のコンテナを停止
echo "🧹 Cleaning up existing containers..."
docker compose down

# すべてのサービスを起動
echo "📦 Building and starting all services..."
docker compose up -d --build

# サービスの起動を待つ
echo "⏳ Waiting for services to start..."
sleep 10

# サービスの状態を確認
echo ""
echo "📊 Service Status:"
docker compose ps

echo ""
echo "✅ Setup complete!"
echo ""
echo "🌐 Access URLs:"
echo "  - Client:         http://localhost:3000"
echo "  - API Server:     http://localhost:8080"
echo "  - MinIO Console:  http://localhost:9001 (minioadmin/minioadmin)"
echo "  - Elasticsearch:  http://localhost:9200"
echo ""
echo "📝 Useful commands:"
echo "  - View logs:      docker compose logs -f"
echo "  - Stop services:  docker compose down"
echo "  - Restart:        docker compose restart"
echo ""
