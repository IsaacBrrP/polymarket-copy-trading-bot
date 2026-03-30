export type EventType = 'poll' | 'trade_detected' | 'trade_executed' | 'error' | 'started';

export type RecentEvent = {
  timestamp: number;
  type: EventType;
  message: string;
};

export type BotStatus = {
  running: boolean;
  startedAt: number | null;
  lastPollAt: number | null;
  monitoredTraderCount: number;
  pollIntervalSeconds: number;
  recentEvents: RecentEvent[];
  errorCount: number;
  lastError: string | null;
  walletAddress: string | null;
};

const MAX_EVENTS = 50;

export class StatusStore {
  private status: BotStatus = {
    running: false,
    startedAt: null,
    lastPollAt: null,
    monitoredTraderCount: 0,
    pollIntervalSeconds: 0,
    recentEvents: [],
    errorCount: 0,
    lastError: null,
    walletAddress: null,
  };

  getStatus(): Readonly<BotStatus> {
    return { ...this.status, recentEvents: [...this.status.recentEvents] };
  }

  setRunning(running: boolean): void {
    this.status.running = running;
  }

  setStarted(walletAddress: string): void {
    this.status.running = true;
    this.status.startedAt = Date.now();
    this.status.walletAddress = walletAddress;
    this.addEvent('started', `Bot started. Wallet: ${walletAddress}`);
  }

  setConfig(monitoredTraderCount: number, pollIntervalSeconds: number): void {
    this.status.monitoredTraderCount = monitoredTraderCount;
    this.status.pollIntervalSeconds = pollIntervalSeconds;
  }

  recordPoll(): void {
    this.status.lastPollAt = Date.now();
    this.addEvent('poll', 'Polling cycle completed');
  }

  recordTradeDetected(trader: string, marketId: string, side: string): void {
    this.addEvent('trade_detected', `Trade detected: ${side} on market ${marketId} by ${trader}`);
  }

  recordTradeExecuted(marketId: string, side: string, sizeUsd: number): void {
    this.addEvent(
      'trade_executed',
      `Trade executed: ${side} $${sizeUsd.toFixed(2)} on market ${marketId}`,
    );
  }

  recordError(message: string): void {
    this.status.errorCount += 1;
    this.status.lastError = message;
    this.addEvent('error', message);
  }

  private addEvent(type: EventType, message: string): void {
    const event: RecentEvent = { timestamp: Date.now(), type, message };
    this.status.recentEvents.push(event);
    if (this.status.recentEvents.length > MAX_EVENTS) {
      this.status.recentEvents.shift();
    }
  }
}
