import { registerAs } from '@nestjs/config';
import { isAddress, type Address, type Hex } from 'viem';
import z from 'zod';

const baseConfigEnv = (): Record<string, unknown> => ({
  port: process.env.PORT ? Number(process.env.PORT) : 3000,
  rpcUrl: process.env.BLOCKCHAIN_RPC_URL,
  bundlerUrl: process.env.CANDIDE_BUNDLER_URL,
  sponsorshipPolicyId: process.env.CANDIDE_SPONSORSHIP_POLICY_ID || undefined,
  executorPrivateKey: process.env.EXECUTOR_PRIVATE_KEY,
  delegationAddress: process.env.DELEGATION_ADDRESS,
});

const baseConfigSchema = z.object({
  port: z.number().int().min(1024).max(65535),
  rpcUrl: z.url(),
  bundlerUrl: z.url(),
  sponsorshipPolicyId: z.string().min(1).optional(),
  executorPrivateKey: z.custom<Hex>(
    (value) => typeof value === 'string' && /^0x[0-9a-fA-F]{64}$/.test(value),
    'must be a 0x-prefixed 32-byte hex string',
  ),
  delegationAddress: z.custom<Address>(
    (value) => typeof value === 'string' && isAddress(value),
    'must be an address',
  ),
});

export type BaseConfig = z.infer<typeof baseConfigSchema>;

export const baseConfig = registerAs('base', (): BaseConfig => {
  return baseConfigSchema.parse(baseConfigEnv());
});
