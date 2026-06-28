#!/usr/bin/env bash
# WorldForge — Development Environment Setup
# Run this once after cloning the repo.

set -e
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}🌍 WorldForge Setup${NC}"
echo "================================"

# ── Check Node.js ──
if ! command -v node &> /dev/null; then
  echo -e "${RED}✗ Node.js not found. Install from https://nodejs.org (v18+)${NC}"
  exit 1
fi
NODE_VER=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VER" -lt 18 ]; then
  echo -e "${RED}✗ Node.js v18+ required (found v$NODE_VER)${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Node.js $(node -v)${NC}"

# ── Check Rust ──
if ! command -v cargo &> /dev/null; then
  echo -e "${YELLOW}⚠ Rust not found. Installing via rustup...${NC}"
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
  source "$HOME/.cargo/env"
fi
echo -e "${GREEN}✓ Rust $(rustc --version)${NC}"

# ── Linux system deps ──
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
  echo -e "${YELLOW}Installing Linux system dependencies...${NC}"
  sudo apt update -qq
  sudo apt install -y \
    libwebkit2gtk-4.1-dev \
    libssl-dev \
    libgtk-3-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev \
    build-essential \
    curl \
    wget \
    file \
    libxdo-dev 2>/dev/null || true
  echo -e "${GREEN}✓ System dependencies installed${NC}"
fi

# ── npm install ──
echo -e "${YELLOW}Installing npm packages...${NC}"
npm install
echo -e "${GREEN}✓ npm packages installed${NC}"

# ── Tauri CLI ──
if ! command -v cargo-tauri &> /dev/null; then
  echo -e "${YELLOW}Installing Tauri CLI...${NC}"
  cargo install tauri-cli --version "^2.0" --locked
fi
echo -e "${GREEN}✓ Tauri CLI ready${NC}"

echo ""
echo -e "${GREEN}================================"
echo -e "✅ Setup complete!"
echo -e "================================${NC}"
echo ""
echo "Start the app in development mode:"
echo -e "  ${YELLOW}npm run tauri:dev${NC}"
echo ""
echo "Build a distributable app:"
echo -e "  ${YELLOW}npm run tauri:build${NC}"
