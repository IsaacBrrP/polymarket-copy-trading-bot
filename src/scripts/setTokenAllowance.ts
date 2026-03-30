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

/** MaxUint256 – unlimited approval. */
const MAX_ALLOWANCE: BigNumber = BigNumber.from(2).pow(256).sub(1);

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
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

  const usdc = new Contract(USDC_POLYGON, ERC20_ABI, wallet);

  const [symbol, decimals]: [string, number] = await Promise.all([usdc.symbol(), usdc.decimals()]);

  const current: BigNumber = await usdc.allowance(owner, spender);
  logger.info(`Wallet   : ${owner}`);
  logger.info(`Spender  : ${spender}`);
  logger.info(`Current ${symbol} allowance: ${utils.formatUnits(current, decimals)}`);

  logger.info('Submitting approval transaction...');

  const tx: any = await usdc.approve(spender, MAX_ALLOWANCE);
  logger.info(`Tx hash  : ${tx.hash}`);
  logger.info('Waiting for confirmation (1 block)...');

  const receipt: any = await tx.wait(1);

  if (receipt.status === 1) {
    logger.info(`Confirmed in block ${receipt.blockNumber}. Approval successful.`);
    logger.info(`Run "npm run verify-allowance" to confirm.`);
  } else {
    logger.error(`Transaction reverted. Block: ${receipt.blockNumber}`);
    process.exit(1);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
