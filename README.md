# Polymarket Copy Trading Bot

Copy the best, automate success. A production-grade Polymarket copy-trading bot that monitors top traders and mirrors their positions with smart, proportional sizing, safety checks, and optional aggregation. Built with TypeScript and the official Polymarket CLOB client.

Keywords: polymarket copy trading bot, polymarket trading bot, polymarket copytrading, polymarket trading tool, prediction markets bot

[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-339933?style=flat&logo=node.js)](https://nodejs.org/)
[![Polymarket CLOB](https://img.shields.io/badge/Polymarket-CLOB%20Client-purple?style=flat)](https://github.com/Polymarket/clob-client)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED?style=flat&logo=docker)](https://www.docker.com/)
[![ESLint](https://img.shields.io/badge/ESLint-configured-4B32C3?style=flat&logo=eslint)](https://eslint.org/)
[![Prettier](https://img.shields.io/badge/Prettier-configured-F7B93E?style=flat&logo=prettier)](https://prettier.io/)

# Contact Me 

[![Email](https://img.shields.io/badge/Email-xsui46941@gmail.com-D14836?style=flat&logo=gmail)](mailto:xsui46941@gmail.com)
[![Telegram](https://img.shields.io/badge/Telegram-@lorine93s-2CA5E0?style=flat&logo=telegram)](https://t.me/lorine93s)
[![Twitter/X](https://img.shields.io/badge/Twitter-@kakamajo__btc-0000f0?style=flat&logo=x)](https://twitter.com/kakamajo_btc)


## Highlights

- Multi-trader copy trading with proportional position sizing
- Real-time monitoring with retry/backoff and structured logs
- Safety checks: min order size, basic slippage guard (scaffold), retry limit
- Extensible strategy layer and modular services
- CLI utilities: allowance check/set/verify, readiness check, stats, simulations
- Live status dashboard (HTTP) and JSON health endpoint
- Docker-ready and cloud-friendly


## Workflow Overview

1) Discovery: the monitor polls recent activity for your selected Polymarket trader addresses.
2) Signal: on a new BUY/SELL, a TradeSignal is created with market, outcome, price, and size.
3) Sizing: the copy strategy computes proportional USD size using your balance and multiplier.
4) Execution: the executor posts a market order via the Polymarket CLOB client (wire-in point).
5) Tracking (optional): persist fills and compute PnL/positions for reporting and proportional exits.

This repo ships a compile-ready scaffold. Wire the real activity feed and order posting where noted to go fully live.


## Architecture & Key Tech

- Language: TypeScript (strict mode)
- Runtime: Node.js 18+
- Trading: `@polymarket/clob-client` (official)
- Crypto: `ethers` wallet/provider
- Data/HTTP: `axios`
- Logging/UI: `chalk`, `ora`
- Optional DB: `mongoose` (MongoDB)
- Quality: ESLint + Prettier
- Container: Docker, docker-compose

Module map (src/modules):
- config/env.ts – env loading/validation
- config/copyStrategy.ts – proportional sizing formula
- services/createClobClient.ts – Polymarket client factory
- services/tradeMonitor.ts – polling loop producing TradeSignal
- services/tradeExecutor.ts – sizing + order submission
- utils/logger.ts – structured console logs
- utils/fetchData.ts, postOrder.ts, getMyBalance.ts, spinner.ts – helpers


## Quick Start

### Prerequisites

- Node.js 18+
- Polygon wallet with USDC and some POL/MATIC for gas
- Optional: MongoDB (for persistent history if you enable it)

### Install

```bash
git clone https://github.com/your-org/polymarket-copy-trading-bot.git
cd polymarket-copy-trading-bot
npm install
```

### Configure

Create an `.env` file in the project root:

```bash
USER_ADDRESSES='0xabc...,0xdef...'
PROXY_WALLET='0xyour_wallet'
PRIVATE_KEY='your_private_key_no_0x'
RPC_URL='https://polygon-mainnet.infura.io/v3/YOUR_PROJECT_ID'

# Optional tuning
FETCH_INTERVAL=1
TRADE_MULTIPLIER=1.0
RETRY_LIMIT=3
TRADE_AGGREGATION_ENABLED=false
TRADE_AGGREGATION_WINDOW_SECONDS=300
```

### Run

```bash
npm run build
npm start
```


## How It Works

1) You provide a list of Polymarket trader addresses to track.  
2) The bot polls recent activity for those traders.  
3) When a new trade is detected, the bot sizes a proportional order based on your capital and `TRADE_MULTIPLIER`.  
4) The bot sends the order via the Polymarket CLOB client.  

Note: This repository ships with a scaffolded monitor/executor. You can extend `src/modules/services/tradeMonitor.ts` to wire real data sources and finalize order routing in `src/modules/services/tradeExecutor.ts`.


## Scripts

- `npm run dev` – run the bot in dev mode (ts-node)
- `npm run start` – run the compiled bot
- `npm run readiness-check` – verify env, RPC, gas, USDC balance & allowance before starting
- `npm run check-allowance` – show current USDC allowance for the Polymarket spender
- `npm run set-token-allowance` – submit on-chain `approve()` for the Polymarket spender
- `npm run verify-allowance` – confirm allowance ≥ threshold (exits 0 = ready, 2 = not ready)
- `npm run simulate` – placeholder for simulation runner


## After Funding Your Wallet

> **Pasos rápidos después de enviar USDC a tu wallet:**

### 1. Verify your balances and allowance

```bash
npm run readiness-check
```

This single command checks everything before you start:
- ✅ Environment variables valid
- ✅ RPC reachable
- ✅ POL/MATIC gas balance ≥ 0.01
- ✅ USDC balance ≥ 10
- ✅ USDC allowance ≥ 10 for the Polymarket spender

If any check fails you will see `[WARN]` with the exact fix.

### 2. Approve USDC spending (first time only)

```bash
npm run set-token-allowance
```

Output shows the transaction hash and confirmation block. You only need to do this once per wallet.

```
[INFO] Wallet   : 0xYourWallet...
[INFO] Spender  : 0x4bFb41d5B3570DeFd03C39a9A4d8de6bd8B8982E
[INFO] Current USDC allowance: 0.0
[INFO] Submitting approval transaction...
[INFO] Tx hash  : 0xabc123...
[INFO] Confirmed in block 12345678. Approval successful.
```

### 3. Confirm readiness

```bash
npm run verify-allowance
```

Exits with code 0 if ready, code 2 if more USDC or allowance is needed.

### 4. Start the bot

```bash
# Local:
npm run dev

# Docker:
docker compose up -d
docker compose logs -f
```


## Monitoring the Bot

### Live status dashboard

While the bot is running, open your browser at:

```
http://localhost:3001/
```

The dashboard auto-refreshes every 10 seconds and shows:
- Running status and uptime
- Number of monitored traders and poll interval
- Last poll time
- Wallet address, native balance, USDC balance
- Error count and last error message
- Last 20 events (detected trades, mirrored trades, failures)

No private key or secret is ever included in the dashboard output.

### JSON endpoints (for automation / curl)

```bash
# Quick health check (200 = running, 503 = stopped)
curl http://localhost:3001/health

# Full status as JSON
curl http://localhost:3001/status
```

### Container logs

```bash
docker compose logs -f
```

Expected healthy output:
```
[INFO] Starting Polymarket Copy Trading Bot
[INFO] Status dashboard: http://localhost:3001/ | JSON: /status | Health: /health
[INFO] Monitoring 2 trader(s) every 1s...
```

### Disable the status server

Set `STATUS_ENABLED=false` in your `.env` to run without the HTTP server.



## Configuration Reference

| Variable | Description | Default |
| --- | --- | --- |
| `USER_ADDRESSES` | Traders to copy (comma-separated or JSON array) | required |
| `PROXY_WALLET` | Your Polygon wallet address | required |
| `PRIVATE_KEY` | Private key without `0x` prefix | required |
| `RPC_URL` | Polygon RPC endpoint (HTTPS) | required |
| `POLYMARKET_SPENDER` | CTF Exchange spender address | `0x4bFb41d5...` |
| `MIN_USDC_THRESHOLD` | Min USDC for readiness/verify checks | `10` |
| `MIN_GAS_THRESHOLD` | Min POL/MATIC for gas (readiness check) | `0.01` |
| `READINESS_STRICT` | Exit on readiness warnings (`false` = warn only) | `true` |
| `STATUS_PORT` | Port for HTTP status/dashboard server | `3001` |
| `STATUS_ENABLED` | Enable HTTP status server | `true` |
| `FETCH_INTERVAL` | Poll frequency in seconds | `1` |
| `TRADE_MULTIPLIER` | Scale position size relative to trader | `1.0` |
| `RETRY_LIMIT` | Max retry attempts on failures | `3` |
| `TRADE_AGGREGATION_ENABLED` | Aggregate sub-$1 buys into one order | `false` |
| `TRADE_AGGREGATION_WINDOW_SECONDS` | Aggregation window (seconds) | `300` |


## Deployment

- Local: `npm run build && npm start`
- Docker: `docker build -t polymarket-copy-bot . && docker run --env-file .env polymarket-copy-bot`
- Compose: `docker-compose up -d`

Set environment variables via `.env` or your orchestrator (render, fly, k8s).


## Security

**Security Score: 75/100** ⚠️ (Fair - Acceptable with Reservations)

This project includes comprehensive security scanning and analysis tools:

```bash
# Run automated security scan
npm run security:scan

# Run dependency security audit
npm run security:audit
```

📊 **Security Documentation:**
- [Complete Security Report (Spanish)](./docs/REPORTE_SEGURIDAD.md)
- [Security Analysis (English)](./docs/SECURITY_ANALYSIS.md)

**Current Status:**
- ✅ No critical vulnerabilities
- ⚠️ 1 high-severity issue (input validation)
- ⚠️ 3 medium-severity issues (dependencies, Docker)
- ✅ Automated security scanning implemented

See [docs/README.md](./docs/README.md) for detailed security information and recommendations.

## Roadmap

- Implement full trade fetching from Polymarket activity feeds
- Finish order routing with price protection and min-size enforcement
- Add MongoDB persistence with position tracking
- Provide full simulation/backtesting toolkit
- ✅ Live status dashboard + JSON health endpoint (COMPLETED)
- ✅ Security scanning and analysis tools (COMPLETED)

## SEO – Polymarket Trading Bot & Copytrading

This project is designed as a professional, extensible Polymarket trading tool. If you are searching for a “Polymarket copy trading bot”, “Polymarket copytrading bot”, or “Polymarket trading bot”, this repository provides a modern TypeScript implementation, leveraging the official CLOB client and best practices for monitoring, risk controls, and modular strategy development.
