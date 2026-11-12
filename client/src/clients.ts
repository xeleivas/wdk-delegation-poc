import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';
import { config } from './config/base.config.js';

export function createPublic() {
  return createPublicClient({ chain: sepolia, transport: http(config.rpcUrl) });
}

export function createDeployerWallet() {
  if (!config.deployerPrivateKey) {
    throw new Error('DEPLOYER_PRIVATE_KEY is required for this command');
  }
  return createWalletClient({
    account: privateKeyToAccount(config.deployerPrivateKey),
    chain: sepolia,
    transport: http(config.rpcUrl),
  });
}
