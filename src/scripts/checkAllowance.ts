import 'dotenv/config';
import { BigNumber, Contract, providers, utils, Wallet } from 'ethers';
import { loadEnv } from '../modules/config/env';
import { ConsoleLogger } from '../modules/utils/logger';

const USDC_POLYGON = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';

/**
 * Default Polymarket CTF Exchange spender on Polygon.
 * Override with POLYMARKET_SPENDER env var if needed.
 */
const DEFAULT_SPENDER = '0x4bFb41d5B3570DeFd03C39a9A4d8de6bd8B8982E';

const ERC20_ABI = [
  'function allowance(address owner, address spender) view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
];

async function run(): Promise<void> {
  const logger = new ConsoleLogger();
  const env = loadEnv();

  const rawSpender = process.env.POLYMARKET_SPENDER ?? DEFAULT_SPENDER;
  if (!utils.isAddress(rawSpender)) {
    logger.error(`Invalid spender address: ${rawSpender}. Set a valid POLYMARKET_SPENDER env var.`);
    process.exit(1);
  }
  const spender = utils.getAddress(rawSpender);

  const provider = new providers.JsonRpcProvider(env.rpcUrl);
  const normalizedKey = env.privateKey.startsWith('0x') ? env.privateKey : `0x${env.privateKey}`;
  const wallet = new Wallet(normalizedKey, provider);
  const owner = wallet.address;

  const usdc = new Contract(USDC_POLYGON, ERC20_ABI, provider);

  const [symbol, decimals, allowance, balance]: [string, number, BigNumber, BigNumber] =
    await Promise.all([
      usdc.symbol(),
      usdc.decimals(),
      usdc.allowance(owner, spender),
      usdc.balanceOf(owner),
    ]);

  logger.info(`Wallet owner : ${owner}`);
  logger.info(`Token        : ${symbol} (${USDC_POLYGON})`);
  logger.info(`Spender      : ${spender}`);
  logger.info(`Balance      : ${utils.formatUnits(balance, decimals)} ${symbol}`);
  logger.info(`Allowance    : ${utils.formatUnits(allowance, decimals)} ${symbol}`);

  if (allowance.isZero()) {
    logger.warn('Allowance is ZERO. Run "npm run set-token-allowance" to approve the spender.');
    process.exit(2);
  } else {
    logger.info('Allowance is set (> 0). Bot can spend USDC through this spender.');
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
