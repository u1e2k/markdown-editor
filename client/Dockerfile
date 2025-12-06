FROM oven/bun:1-alpine

WORKDIR /app

# 依存関係をインストール
COPY package.json bun.lockb* ./
RUN bun install

# ソースコードをコピー
COPY . .

EXPOSE 3000

# 開発モードで起動
CMD ["bun", "run", "dev", "--host", "0.0.0.0"]
