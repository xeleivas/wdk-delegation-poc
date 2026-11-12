import { isAddress, type Address } from 'viem';

try {
  process.loadEnvFile('../.env');
} catch {
  // env vars may already be set in the shell
}

export const SEPOLIA_CHAIN_ID = 11155111;

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing env var ${name}`);
  }
  return value;
}

export function requireAddressEnv(name: string): Address {
  const value = requireEnv(name);
  if (!isAddress(value)) {
    throw new Error(`Env var ${name} is not an address`);
  }
  return value;
}
