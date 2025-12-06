#!/bin/bash
cd /workspaces/markdown-editor
echo "Installing dependencies in container..."
docker compose exec -T api bun install
echo "Restarting API container..."
docker compose restart api
echo "Waiting for API to start..."
sleep 3
echo "=== API Logs ==="
docker logs jade-api --tail 30
