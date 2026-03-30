import 'dotenv/config';
import { loadEnv } from './modules/config/env';
import { createPolymarketClient } from './modules/services/createClobClient';
import { TradeMonitor } from './modules/services/tradeMonitor';
import { TradeExecutor } from './modules/services/tradeExecutor';
import { ConsoleLogger } from './modules/utils/logger';
import { botState } from './modules/services/botState';
import { startStatusServer } from './modules/services/statusServer';

async function main(): Promise<void> {
  const logger = new ConsoleLogger();
  const env = loadEnv();

  logger.info('Starting Polymarket Copy Trading Bot');

  // Start optional status/monitoring HTTP server
  const statusPort = parseInt(process.env.STATUS_PORT ?? '3001', 10);
  if (process.env.STATUS_ENABLED !== 'false') {
    startStatusServer({ port: statusPort, logger });
  }

  const client = await createPolymarketClient({ rpcUrl: env.rpcUrl, privateKey: env.privateKey });

  // Initialise shared bot state (no private data exposed)
  botState.setConfig(env.userAddresses.length, env.fetchIntervalSeconds);
  botState.setWallet({ address: client.wallet.address, nativeBalance: null, usdcBalance: null });

  const executor = new TradeExecutor({ client, proxyWallet: env.proxyWallet, logger, env });

  const monitor = new TradeMonitor({
    client,
    logger,
    env,
    userAddresses: env.userAddresses,
    onTick: () => botState.recordPoll(),
    onDetectedTrade: async (signal) => {
      botState.recordTradeDetected(signal.trader, signal.marketId, signal.side);
      try {
        await executor.copyTrade(signal);
        botState.recordTradeMirrored(signal.marketId, signal.sizeUsd);
      } catch (err) {
        botState.recordTradeFailed(signal.marketId, (err as Error).message);
      }
    },
  });

  botState.setRunning(true);
  await monitor.start();
}

main().catch((err) => {
  console.error('Fatal error', err);
  process.exit(1);
});
