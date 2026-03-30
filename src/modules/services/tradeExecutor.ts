import type { ClobClient } from '@polymarket/clob-client';
import type { Wallet } from 'ethers';
import type { RuntimeEnv } from '../config/env';
import type { Logger } from '../utils/logger';
import type { TradeSignal } from './tradeMonitor';
import type { StatusStore } from '../monitoring/statusStore';
import { computeProportionalSizing } from '../config/copyStrategy';
import { postOrder } from '../utils/postOrder';
import { getUsdBalanceApprox } from '../utils/getMyBalance';

export type TradeExecutorDeps = {
  client: ClobClient & { wallet: Wallet };
  proxyWallet: string;
  env: RuntimeEnv;
  logger: Logger;
  statusStore?: StatusStore;
};

export class TradeExecutor {
  private readonly deps: TradeExecutorDeps;

  constructor(deps: TradeExecutorDeps) {
    this.deps = deps;
  }

  async copyTrade(signal: TradeSignal): Promise<void> {
    const { logger, env, client, statusStore } = this.deps;
    try {
      statusStore?.recordTradeDetected(signal.trader, signal.marketId, signal.side);

      const yourUsdBalance = await getUsdBalanceApprox(client.wallet);
      const sizing = computeProportionalSizing({
        yourUsdBalance,
        traderUsdBalance: Math.max(1, signal.sizeUsd * 20), // rough guess; replace with real data
        traderTradeUsd: signal.sizeUsd,
        multiplier: env.tradeMultiplier,
      });

      logger.info(
        `Sizing ratio ${(sizing.ratio * 100).toFixed(2)}% => ${sizing.targetUsdSize.toFixed(2)} USD`,
      );

      await postOrder({
        client,
        marketId: signal.marketId,
        outcome: signal.outcome,
        side: signal.side,
        sizeUsd: sizing.targetUsdSize,
      });

      statusStore?.recordTradeExecuted(signal.marketId, signal.side, sizing.targetUsdSize);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error('Failed to copy trade', err as Error);
      statusStore?.recordError(`Failed to copy trade: ${message}`);
    }
  }
}
