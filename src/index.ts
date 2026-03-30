import 'dotenv/config';
import { loadEnv } from './modules/config/env';
import { createPolymarketClient } from './modules/services/createClobClient';
import { TradeMonitor } from './modules/services/tradeMonitor';
import { TradeExecutor } from './modules/services/tradeExecutor';
import { ConsoleLogger } from './modules/utils/logger';
import { StatusStore } from './modules/monitoring/statusStore';
import { createMonitoringServer } from './modules/monitoring/monitoringServer';

async function main(): Promise<void> {
  const logger = new ConsoleLogger();
  const env = loadEnv();

  logger.info('Starting Polymarket Copy Trading Bot');

  const statusStore = new StatusStore();
  createMonitoringServer(statusStore, env.monitoringPort, env.monitoringHost, logger);

  const client = await createPolymarketClient({ rpcUrl: env.rpcUrl, privateKey: env.privateKey });
  statusStore.setStarted(client.wallet.address);

  const executor = new TradeExecutor({
    client,
    proxyWallet: env.proxyWallet,
    logger,
    env,
    statusStore,
  });

  const monitor = new TradeMonitor({
    client,
    logger,
    env,
    userAddresses: env.userAddresses,
    statusStore,
    onDetectedTrade: async (signal) => {
      await executor.copyTrade(signal);
    },
  });

  await monitor.start();
}

main().catch((err) => {
  console.error('Fatal error', err);
  process.exit(1);
});
