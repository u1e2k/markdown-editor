# 必須ツールのインストール

このプロジェクトを動かすために必要なツールのインストール手順です。

## 1. Rust のインストール

### Linux / macOS / WSL

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

インストール後、環境変数を読み込む:

```bash
source "$HOME/.cargo/env"
```

### Windows

[rustup-init.exe](https://rustup.rs/) をダウンロードして実行してください。

### バージョン確認

```bash
rustc --version
cargo --version
```

## 2. wasm-pack のインストール

Rustインストール後:

```bash
curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh
```

### バージョン確認

```bash
wasm-pack --version
```

## 3. Bun のインストール

### Linux / macOS / WSL

```bash
curl -fsSL https://bun.sh/install | bash
```

### Windows (PowerShell)

```powershell
powershell -c "irm bun.sh/install.ps1 | iex"
```

### バージョン確認

```bash
bun --version
```

## 4. Docker のインストール

### Linux

```bash
# Docker のインストール
curl -fsSL https://get.docker.com | sh

# Docker Compose のインストール
sudo apt-get update
sudo apt-get install docker-compose-plugin
```

### macOS

[Docker Desktop for Mac](https://www.docker.com/products/docker-desktop/) をインストール

### Windows

[Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/) をインストール

## 自動セットアップ

すべてのツールがインストールされていれば、以下のコマンドで自動セットアップできます:

```bash
./setup.sh
```

このスクリプトは以下を自動で行います:
- Rust/wasm-pack/Bunのインストール確認と自動インストール
- Wasmモジュールのビルド
- Dockerサービスの起動
- 依存パッケージのインストール

## トラブルシューティング

### Rustのパスが通らない場合

```bash
source "$HOME/.cargo/env"
# または
export PATH="$HOME/.cargo/bin:$PATH"
```

### Bunのパスが通らない場合

```bash
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"
```

これらを `~/.bashrc` または `~/.zshrc` に追加することで永続化できます。
