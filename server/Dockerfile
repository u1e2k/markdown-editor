FROM oven/bun:1-alpine

WORKDIR /app

COPY package.json bun.lockb* ./
RUN bun install

COPY . .

RUN bun run build

EXPOSE 8080

CMD ["bun", "start"]
