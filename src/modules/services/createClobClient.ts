import { Wallet, providers } from 'ethers';
import { ClobClient } from '@polymarket/clob-client';
import { Chain } from '@polymarket/clob-client';

export type CreateClientInput = {
  rpcUrl: string;
  privateKey: string;
};

export async function createPolymarketClient(
  input: CreateClientInput,
): Promise<ClobClient & { wallet: Wallet } > {
  const provider = new providers.JsonRpcProvider(input.rpcUrl);
  const wallet = new Wallet(input.privateKey, provider);

  // Create CLOB client with the wallet
  const client = new ClobClient(
    'https://clob.polymarket.com',  // Production host
    Chain.POLYGON,                   // Polygon mainnet
    wallet
  );

  return Object.assign(client, { wallet });
}


