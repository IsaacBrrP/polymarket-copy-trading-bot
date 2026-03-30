import 'dotenv/config';
import { BigNumber, Contract, providers, utils, Wallet } from 'ethers';
import { loadEnv } from '../modules/config/env';
import { ConsoleLogger } from '../modules/utils/logger';

const USDC_POLYGON = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';
const DEFAULT_SPENDER = '0x4bFb41d5B3570DeFd03C39a9A4d8de6bd8B8982E';
const DEFAULT_MIN_GAS_ETH = '0.01'; // minimum POL/MATIC for gas
const DEFAULT_MIN_USDC = '10'; // minimum USDC

const ERC20_ABI = [
  'function allowance(address owner, address spender) view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
];

async function run(): Promise<void> {
  const logger = new ConsoleLogger();
  /**
   * READINESS_STRICT=false → warnings only, bot may still start.
   * Default (true) → exit(2) on any warning.
   */
  const strict = process.env.READINESS_STRICT !== 'false';
  let warnings = 0;

  logger.info('=== Polymarket Bot – Readiness Check ===');

  // 1) Validate environment variables
  let env: ReturnType<typeof loadEnv>;
  try {
    env = loadEnv();
    logger.info('[OK] Environment variables validated');
  } catch (err) {
    logger.error('[FAIL] Invalid environment variables', err as Error);
    process.exit(1);
  }

  // Validate spender address
  const rawSpender = process.env.POLYMARKET_SPENDER ?? DEFAULT_SPENDER;
  if (!utils.isAddress(rawSpender)) {
    logger.error(
      `[FAIL] Invalid POLYMARKET_SPENDER: "${rawSpender}". Must be a valid Ethereum address.`,
    );
    process.exit(1);
  }
  const spender = utils.getAddress(rawSpender);

  const minGas = utils.parseEther(process.env.MIN_GAS_THRESHOLD ?? DEFAULT_MIN_GAS_ETH);
  const minUsdcStr = process.env.MIN_USDC_THRESHOLD ?? DEFAULT_MIN_USDC;

  const provider = new providers.JsonRpcProvider(env.rpcUrl);
  const normalizedKey = env.privateKey.startsWith('0x') ? env.privateKey : `0x${env.privateKey}`;
  const wallet = new Wallet(normalizedKey, provider);
  const owner = wallet.address;

  // 2) Check RPC connectivity
  try {
    const blockNumber = await provider.getBlockNumber();
    logger.info(`[OK] RPC connected. Latest block: ${blockNumber}`);
  } catch (err) {
    logger.error('[FAIL] Cannot connect to RPC. Check RPC_URL.', err as Error);
    process.exit(1);
  }

  // 3) Check native gas balance (POL/MATIC)
  try {
    const gasBalance: BigNumber = await provider.getBalance(owner);
    const gasFormatted = utils.formatEther(gasBalance);
    if (gasBalance.lt(minGas)) {
      logger.warn(
        `[WARN] Low native balance: ${gasFormatted} POL (min: ${utils.formatEther(minGas)}). ` +
          `Send POL to ${owner} for gas fees.`,
      );
      warnings++;
    } else {
      logger.info(`[OK] Native balance: ${gasFormatted} POL`);
    }
  } catch (err) {
    logger.error('[FAIL] Cannot read native balance', err as Error);
    process.exit(1);
  }

  // 4) USDC balance and allowance
  try {
    const usdc = new Contract(USDC_POLYGON, ERC20_ABI, provider);
    const [symbol, decimals, balance, allowance]: [string, number, BigNumber, BigNumber] =
      await Promise.all([
        usdc.symbol(),
        usdc.decimals(),
        usdc.balanceOf(owner),
        usdc.allowance(owner, spender),
      ]);

    const minUsdc = utils.parseUnits(minUsdcStr, decimals);
    const balFmt = utils.formatUnits(balance, decimals);
    const allowFmt = utils.formatUnits(allowance, decimals);

    if (balance.lt(minUsdc)) {
      logger.warn(
        `[WARN] Low ${symbol} balance: ${balFmt} (min: ${minUsdcStr}). ` + `Send USDC to ${owner}.`,
      );
      warnings++;
    } else {
      logger.info(`[OK] ${symbol} balance: ${balFmt}`);
    }

    if (allowance.isZero()) {
      logger.warn(
        `[WARN] ${symbol} allowance is ZERO for spender ${spender}. ` +
          `Run: npm run set-token-allowance`,
      );
      warnings++;
    } else if (allowance.lt(minUsdc)) {
      logger.warn(
        `[WARN] Low ${symbol} allowance: ${allowFmt} (min: ${minUsdcStr}). ` +
          `Run: npm run set-token-allowance`,
      );
      warnings++;
    } else {
      logger.info(`[OK] ${symbol} allowance: ${allowFmt}`);
    }
  } catch (err) {
    logger.error('[FAIL] Cannot read USDC data from chain', err as Error);
    process.exit(1);
  }

  // 5) Summary
  logger.info('=== Readiness Summary ===');
  if (warnings === 0) {
    logger.info('All checks passed. Bot is ready to start.');
  } else {
    logger.warn(`${warnings} warning(s) found.`);
    if (strict) {
      logger.error(
        'Strict mode: fix the warnings above before starting. (Set READINESS_STRICT=false to run anyway.)',
      );
      process.exit(2);
    } else {
      logger.warn('Warning mode: bot may start with reduced functionality.');
    }
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
