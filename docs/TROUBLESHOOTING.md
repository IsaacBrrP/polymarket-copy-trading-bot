# Troubleshooting

## Bot not detecting trades
- Verify `USER_ADDRESSES`
- Ensure tracked traders are actively trading
- Increase `FETCH_INTERVAL`

## Orders not submitting
- Check USDC balance and gas funds
- Verify `RPC_URL` is healthy
- Confirm private key is correct and matches `PROXY_WALLET`

## Zero USDC balance
Run the readiness check to see exact balances:
```bash
npm run readiness-check
```
Your wallet address is shown in the output. Send USDC (Polygon) to that address from a CEX or bridge.

## Zero allowance / Bot cannot spend USDC
```bash
npm run check-allowance   # shows current allowance
npm run set-token-allowance  # submits on-chain approve()
npm run verify-allowance  # confirms ≥ threshold
```
This only needs to be done once per wallet.

## Invalid spender address error
The default spender is the Polymarket CTF Exchange on Polygon: `0x4bFb41d5B3570DeFd03C39a9A4d8de6bd8B8982E`.
If you see "Invalid spender address", set a valid address in your `.env`:
```env
POLYMARKET_SPENDER=0x4bFb41d5B3570DeFd03C39a9A4d8de6bd8B8982E
```

## Private key error (`invalid hexlify value`)
Your `PRIVATE_KEY` must be the raw 64-character hex string **without** a `0x` prefix.
Example: `PRIVATE_KEY=abcdef1234567890...` (64 hex chars, no `0x`).

## RPC connection failure
Verify `RPC_URL` is a valid HTTPS endpoint with your API key. Free options:
- Alchemy: `https://polygon-mainnet.g.alchemy.com/v2/YOUR_KEY`
- Infura: `https://polygon-mainnet.infura.io/v3/YOUR_KEY`
- Ankr: `https://rpc.ankr.com/polygon`

## Status dashboard not loading
- Check `STATUS_PORT` is not blocked by a firewall
- Confirm `STATUS_ENABLED` is not set to `false`
- In Docker, ensure the port is published: `docker compose up -d` (the compose file publishes it automatically)
- Access at: `http://localhost:3001/`

## Secrets must never appear in logs
The status endpoint (`/status`, `/health`, `/dashboard`) and all log output **never include**:
- `PRIVATE_KEY`
- `MONGO_URI`
- Any other secret env vars

Only the public wallet address, balances, and event summaries are shown.
If you suspect a secret leaked into logs, rotate the key immediately.

