import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';
import { requireEnv } from './config.js';

export function createPublic() {
  return createPublicClient({ chain: sepolia, transport: http(requireEnv('BLOCKCHAIN_RPC_URL')) });
}

export function createDeployerWallet() {
  const key = requireEnv('DEPLOYER_PRIVATE_KEY');
  if (!/^0x[0-9a-fA-F]{64}$/.test(key)) {
    throw new Error('DEPLOYER_PRIVATE_KEY must be a 0x-prefixed 32-byte hex string');
  }
  return createWalletClient({
    account: privateKeyToAccount(key as `0x${string}`),
    chain: sepolia,
    transport: http(requireEnv('BLOCKCHAIN_RPC_URL')),
  });
}
