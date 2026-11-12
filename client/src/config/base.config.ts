import { isAddress, type Address, type Hex } from 'viem';
import z from 'zod';

try {
  process.loadEnvFile('../.env');
} catch {
  // env vars may already be set in the shell
}

const baseConfigEnv = (): Record<string, unknown> => ({
  rpcUrl: process.env.BLOCKCHAIN_RPC_URL,
  bundlerUrl: process.env.CANDIDE_BUNDLER_URL,
  sponsorshipPolicyId: process.env.CANDIDE_SPONSORSHIP_POLICY_ID || undefined,
  deployerPrivateKey: process.env.DEPLOYER_PRIVATE_KEY || undefined,
  delegationAddress: process.env.DELEGATION_ADDRESS,
  mockTokenAddress: process.env.MOCK_TOKEN_ADDRESS,
});

const addressSchema = z.custom<Address>((value) => typeof value === 'string' && isAddress(value), 'must be an address');

const baseConfigSchema = z.object({
  rpcUrl: z.url(),
  bundlerUrl: z.url(),
  sponsorshipPolicyId: z.string().min(1).optional(),
  deployerPrivateKey: z
    .custom<Hex>(
      (value) => typeof value === 'string' && /^0x[0-9a-fA-F]{64}$/.test(value),
      'must be a 0x-prefixed 32-byte hex string',
    )
    .optional(),
  delegationAddress: addressSchema,
  mockTokenAddress: addressSchema,
});

export type BaseConfig = z.infer<typeof baseConfigSchema>;

export const config: BaseConfig = baseConfigSchema.parse(baseConfigEnv());
