import type { ClobClient } from '@polymarket/clob-client';
import type { RuntimeEnv } from '../config/env';
import type { Logger } from '../utils/logger';
import type { StatusStore } from '../monitoring/statusStore';

export type TradeSignal = {
  trader: string;
  marketId: string;
  outcome: 'YES' | 'NO';
  side: 'BUY' | 'SELL';
  sizeUsd: number;
  price: number;
  timestamp: number;
};

export type TradeMonitorDeps = {
  client: ClobClient;
  env: RuntimeEnv;
  logger: Logger;
  userAddresses: string[];
  onDetectedTrade: (signal: TradeSignal) => Promise<void>;
  statusStore?: StatusStore;
};

export class TradeMonitor {
  private readonly deps: TradeMonitorDeps;
  private timer?: NodeJS.Timeout;

  constructor(deps: TradeMonitorDeps) {
    this.deps = deps;
  }

  async start(): Promise<void> {
    const { logger, env, statusStore } = this.deps;
    logger.info(
      `Monitoring ${this.deps.userAddresses.length} trader(s) every ${env.fetchIntervalSeconds}s...`,
    );
    statusStore?.setConfig(this.deps.userAddresses.length, env.fetchIntervalSeconds);
    this.timer = setInterval(
      () => void this.tick().catch(() => undefined),
      env.fetchIntervalSeconds * 1000,
    );
    await this.tick();
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private async tick(): Promise<void> {
    const { logger, statusStore } = this.deps;
    try {
      // Placeholder: fetch recent fills for each tracked trader. Replace with Polymarket APIs as needed
      for (const trader of this.deps.userAddresses) {
        // TODO: Implement real fetch from Polymarket activity feed
        logger.debug(`Polling activity for ${trader}`);
        // No-op in scaffold
      }
      statusStore?.recordPoll();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error('Monitor tick failed', err as Error);
      statusStore?.recordError(`Monitor tick failed: ${message}`);
    }
  }
}
