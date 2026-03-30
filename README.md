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
- CLI utilities (allowance, stats, simulations – scaffold)
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
- `npm run dev:monitor` – run in dev mode with monitoring server on port 3001
- `npm run start` – run the compiled bot
- `npm run check-allowance` – example utility script (scaffold)
- `npm run simulate` – placeholder for simulation runner


## Monitoring Interface

The bot ships with a built-in HTTP monitoring server that exposes runtime status without leaking secrets.

### Endpoints

| Endpoint | Description |
| --- | --- |
| `GET /` | Lightweight HTML dashboard (auto-refreshes every 10 s) |
| `GET /health` | JSON health check `{ ok, running, uptime }` |
| `GET /status` | Full JSON status (state, last poll, events, errors, wallet address) |

### Quick Start

```bash
# Dev mode with monitor (default port 3001)
npm run dev:monitor

# Check health
curl http://localhost:3001/health

# Full status
curl http://localhost:3001/status

# Open dashboard in browser
open http://localhost:3001
```

### Configuration

Add to your `.env`:

```env
MONITORING_PORT=3001        # default – change if port is taken
MONITORING_HOST=127.0.0.1  # default – localhost only (safe for local use)
```

### Docker / Compose

The monitoring port is exposed automatically via `docker-compose`:

```bash
docker-compose up -d
# Dashboard available at http://localhost:3001
```

To override the port:

```env
MONITORING_PORT=8080
```

### Status Fields

| Field | Description |
| --- | --- |
| `running` | Whether the bot loop is active |
| `startedAt` | Unix timestamp of bot start |
| `lastPollAt` | Timestamp of the last poll cycle |
| `monitoredTraderCount` | Number of trader addresses being monitored |
| `pollIntervalSeconds` | Configured poll frequency |
| `recentEvents` | Bounded list of last 50 events (polls, trades, errors) |
| `errorCount` | Cumulative error count since start |
| `lastError` | Most recent error message (if any) |
| `walletAddress` | Your public wallet address (**never** private key) |

> **Security**: The monitoring endpoint never exposes `PRIVATE_KEY` or any other secret environment variable.


## Configuration Reference

| Variable | Description | Example |
| --- | --- | --- |
| `USER_ADDRESSES` | Traders to copy (comma-separated or JSON array) | `"0xabc...,0xdef..."` |
| `PROXY_WALLET` | Your Polygon wallet address | `"0x123..."` |
| `PRIVATE_KEY` | Private key without 0x prefix | `"abcd..."` |
| `RPC_URL` | Polygon RPC endpoint | `"https://polygon-mainnet.infura.io/v3/..."` |
| `FETCH_INTERVAL` | Poll frequency in seconds | `1` |
| `TRADE_MULTIPLIER` | Scale position size relative to trader | `2.0` |
| `RETRY_LIMIT` | Max retry attempts on failures | `3` |
| `TRADE_AGGREGATION_ENABLED` | Aggregate sub-$1 buys into one order | `true` |
| `TRADE_AGGREGATION_WINDOW_SECONDS` | Aggregation window (seconds) | `300` |
| `MONITORING_PORT` | HTTP monitoring server port | `3001` |
| `MONITORING_HOST` | Monitoring server bind address (`127.0.0.1` = localhost only) | `127.0.0.1` |


## Deployment

- Local: `npm run build && npm start`
- Docker: `docker build -t polymarket-copy-bot . && docker run --env-file .env -p 3001:3001 polymarket-copy-bot`
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
- Add web dashboard for monitoring
- ✅ Security scanning and analysis tools (COMPLETED)

## SEO – Polymarket Trading Bot & Copytrading

This project is designed as a professional, extensible Polymarket trading tool. If you are searching for a “Polymarket copy trading bot”, “Polymarket copytrading bot”, or “Polymarket trading bot”, this repository provides a modern TypeScript implementation, leveraging the official CLOB client and best practices for monitoring, risk controls, and modular strategy development.
