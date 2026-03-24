import { utils } from 'ethers';

export type RuntimeEnv = {
  userAddresses: string[];
  proxyWallet: string;
  privateKey: string;
  mongoUri?: string;
  rpcUrl: string;
  fetchIntervalSeconds: number;
  tradeMultiplier: number;
  retryLimit: number;
  aggregationEnabled: boolean;
  aggregationWindowSeconds: number;
};

export function loadEnv(): RuntimeEnv {
  const parseList = (val: string | undefined): string[] => {
    if (!val) return [];
    try {
      const maybeJson = JSON.parse(val);
      if (Array.isArray(maybeJson)) return maybeJson.map(String);
    } catch (_) {
      // not JSON, parse as comma separated
    }
    return val
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  };

  const required = (name: string, v: string | undefined): string => {
    if (!v) throw new Error(`Missing required env var: ${name}`);
    return v;
  };

  const validateAddress = (address: string, fieldName: string): string => {
    if (!utils.isAddress(address)) {
      throw new Error(`Invalid Ethereum address for ${fieldName}: ${address}`);
    }
    return address;
  };

  const validateNumber = (value: string | number, name: string, min?: number, max?: number): number => {
    const num = Number(value);
    if (isNaN(num) || !isFinite(num)) {
      throw new Error(`Invalid ${name}: ${value} (must be a valid number)`);
    }
    if (min !== undefined && num < min) {
      throw new Error(`Invalid ${name}: ${value} (must be >= ${min})`);
    }
    if (max !== undefined && num > max) {
      throw new Error(`Invalid ${name}: ${value} (must be <= ${max})`);
    }
    return num;
  };

  const validateRpcUrl = (url: string): string => {
    if (!url.startsWith('https://') && !url.startsWith('http://localhost') && !url.startsWith('http://127.0.0.1')) {
      throw new Error('RPC_URL must use HTTPS protocol (or localhost for development)');
    }
    return url;
  };

  const userAddressList = parseList(process.env.USER_ADDRESSES);
  const validatedUserAddresses = userAddressList.map((addr, idx) =>
    validateAddress(addr, `USER_ADDRESSES[${idx}]`)
  );

  const env: RuntimeEnv = {
    userAddresses: validatedUserAddresses,
    proxyWallet: validateAddress(required('PROXY_WALLET', process.env.PROXY_WALLET), 'PROXY_WALLET'),
    privateKey: required('PRIVATE_KEY', process.env.PRIVATE_KEY),
    mongoUri: process.env.MONGO_URI,
    rpcUrl: validateRpcUrl(required('RPC_URL', process.env.RPC_URL)),
    fetchIntervalSeconds: validateNumber(process.env.FETCH_INTERVAL ?? 1, 'FETCH_INTERVAL', 0.1),
    tradeMultiplier: validateNumber(process.env.TRADE_MULTIPLIER ?? 1.0, 'TRADE_MULTIPLIER', 0),
    retryLimit: validateNumber(process.env.RETRY_LIMIT ?? 3, 'RETRY_LIMIT', 0, 100),
    aggregationEnabled: String(process.env.TRADE_AGGREGATION_ENABLED ?? 'false') === 'true',
    aggregationWindowSeconds: validateNumber(process.env.TRADE_AGGREGATION_WINDOW_SECONDS ?? 300, 'TRADE_AGGREGATION_WINDOW_SECONDS', 0),
  };

  return env;
}


