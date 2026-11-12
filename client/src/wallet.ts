import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import WalletManagerEvm7702Gasless, {
  type Evm7702GaslessWalletConfig,
  type WalletAccountEvm7702Gasless,
} from '@tetherto/wdk-wallet-evm-7702-gasless';
import { SEPOLIA_CHAIN_ID, requireAddressEnv, requireEnv } from './config.js';

const SEED_FILE = resolve(import.meta.dirname, '../wallet.seed');

export function createSeedFile(): void {
  if (existsSync(SEED_FILE)) {
    throw new Error(`${SEED_FILE} already exists, refusing to overwrite`);
  }
  writeFileSync(SEED_FILE, WalletManagerEvm7702Gasless.getRandomSeedPhrase(), { mode: 0o600 });
}

function buildWalletConfig(): Evm7702GaslessWalletConfig {
  const sponsorshipPolicyId = process.env.CANDIDE_SPONSORSHIP_POLICY_ID;
  return {
    provider: requireEnv('BLOCKCHAIN_RPC_URL'),
    bundlerUrl: requireEnv('CANDIDE_BUNDLER_URL'),
    delegationAddress: requireAddressEnv('DELEGATION_ADDRESS'),
    entryPointVersion: '0.8',
    chainId: SEPOLIA_CHAIN_ID,
    isSponsored: true,
    ...(sponsorshipPolicyId ? { sponsorshipPolicyId } : {}),
  };
}

export async function loadAccount(): Promise<WalletAccountEvm7702Gasless> {
  const seed = readFileSync(SEED_FILE, 'utf8');
  const manager = new WalletManagerEvm7702Gasless(seed, buildWalletConfig());
  return manager.getAccount(0);
}
