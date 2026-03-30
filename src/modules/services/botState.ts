export type EventType = 'trade_detected' | 'trade_mirrored' | 'trade_failed' | 'error' | 'poll';

export type BotEvent = {
  timestamp: number;
  type: EventType;
  detail: string;
};

export type WalletSummary = {
  /** Public address only – never expose private key here. */
  address: string;
  nativeBalance: string | null;
  usdcBalance: string | null;
};

export type BotStatus = {
  running: boolean;
  startedAt: number | null;
  lastPollAt: number | null;
  monitoredAddresses: number;
  pollIntervalSeconds: number;
  recentEvents: BotEvent[];
  errorCount: number;
  lastError: string | null;
  wallet: WalletSummary | null;
};

const MAX_EVENTS = 50;

class BotStateStore {
  private state: BotStatus = {
    running: false,
    startedAt: null,
    lastPollAt: null,
    monitoredAddresses: 0,
    pollIntervalSeconds: 0,
    recentEvents: [],
    errorCount: 0,
    lastError: null,
    wallet: null,
  };

  setRunning(running: boolean): void {
    this.state.running = running;
    if (running && this.state.startedAt === null) {
      this.state.startedAt = Date.now();
    }
  }

  setConfig(monitoredAddresses: number, pollIntervalSeconds: number): void {
    this.state.monitoredAddresses = monitoredAddresses;
    this.state.pollIntervalSeconds = pollIntervalSeconds;
  }

  setWallet(wallet: WalletSummary): void {
    this.state.wallet = wallet;
  }

  recordPoll(): void {
    this.state.lastPollAt = Date.now();
  }

  recordTradeDetected(trader: string, marketId: string, side: string): void {
    this.addEvent('trade_detected', `${side} on market ${marketId} by ${trader.slice(0, 10)}…`);
  }

  recordTradeMirrored(marketId: string, sizeUsd: number): void {
    this.addEvent('trade_mirrored', `Mirrored $${sizeUsd.toFixed(2)} on market ${marketId}`);
  }

  recordTradeFailed(marketId: string, reason: string): void {
    this.state.errorCount++;
    this.state.lastError = reason;
    this.addEvent('trade_failed', `Failed on market ${marketId}: ${reason}`);
  }

  recordError(detail: string): void {
    this.state.errorCount++;
    this.state.lastError = detail;
    this.addEvent('error', detail);
  }

  getStatus(): BotStatus {
    return { ...this.state, recentEvents: [...this.state.recentEvents] };
  }

  private addEvent(type: EventType, detail: string): void {
    this.state.recentEvents.unshift({ timestamp: Date.now(), type, detail });
    if (this.state.recentEvents.length > MAX_EVENTS) {
      this.state.recentEvents.length = MAX_EVENTS;
    }
  }
}

/** Singleton – import this in any module that needs to read/write bot state. */
export const botState = new BotStateStore();
