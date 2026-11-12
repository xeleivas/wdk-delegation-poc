import { registerAs } from '@nestjs/config';
import { isAddress, type Address, type Hex } from 'viem';

export interface PocConfig {
  rpcUrl: string;
  bundlerUrl: string;
  sponsorshipPolicyId?: string;
  executorPrivateKey: Hex;
  delegationAddress: Address;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing env var ${name}`);
  }
  return value;
}

export const pocConfig = registerAs('poc', (): PocConfig => {
  const executorPrivateKey = requireEnv('EXECUTOR_PRIVATE_KEY');
  const delegationAddress = requireEnv('DELEGATION_ADDRESS');
  if (!/^0x[0-9a-fA-F]{64}$/.test(executorPrivateKey)) {
    throw new Error('EXECUTOR_PRIVATE_KEY must be a 0x-prefixed 32-byte hex string');
  }
  if (!isAddress(delegationAddress)) {
    throw new Error('DELEGATION_ADDRESS is not an address');
  }
  return {
    rpcUrl: requireEnv('BLOCKCHAIN_RPC_URL'),
    bundlerUrl: requireEnv('CANDIDE_BUNDLER_URL'),
    sponsorshipPolicyId: process.env.CANDIDE_SPONSORSHIP_POLICY_ID || undefined,
    executorPrivateKey: executorPrivateKey as Hex,
    delegationAddress,
  };
});
