import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import WalletManagerEvm7702Gasless, {
  type Evm7702GaslessWalletConfig,
  type WalletAccountEvm7702Gasless,
} from '@tetherto/wdk-wallet-evm-7702-gasless';
import { sepolia } from 'viem/chains';
import { config } from './config/base.config.js';

const SEED_FILE = resolve(import.meta.dirname, '../wallet.seed');

export function createSeedFile(): void {
  if (existsSync(SEED_FILE)) {
    throw new Error(`${SEED_FILE} already exists, refusing to overwrite`);
  }
  writeFileSync(SEED_FILE, WalletManagerEvm7702Gasless.getRandomSeedPhrase(), { mode: 0o600 });
}

const walletConfig: Evm7702GaslessWalletConfig = {
  provider: config.rpcUrl,
  bundlerUrl: config.bundlerUrl,
  delegationAddress: config.delegationAddress,
  entryPointVersion: '0.8',
  chainId: sepolia.id,
  isSponsored: true,
  ...(config.sponsorshipPolicyId ? { sponsorshipPolicyId: config.sponsorshipPolicyId } : {}),
};

export async function loadAccount(): Promise<WalletAccountEvm7702Gasless> {
  const seed = readFileSync(SEED_FILE, 'utf8');
  const manager = new WalletManagerEvm7702Gasless(seed, walletConfig);
  return manager.getAccount(0);
}
