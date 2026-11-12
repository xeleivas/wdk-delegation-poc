import type { Address, Hex, PublicClient } from 'viem';
import type { PrivateKeyAccount } from 'viem/accounts';
import {
  entryPoint08Abi,
  entryPoint08Address,
  getUserOperationHash,
  toSmartAccount,
  type SmartAccount,
} from 'viem/account-abstraction';
import { encodeExecute } from './encode-transfer';

// 65-byte placeholder with a well-formed ECDSA layout, used only for gas estimation.
const STUB_SIGNATURE: Hex = `0x${'ff'.repeat(32)}${'aa'.repeat(32)}1c`;

/**
 * Smart account view of the user's delegated EOA, signed by the executor key instead of the owner key.
 */
export function createExecutorAccount({
  client,
  userAddress,
  executor,
}: {
  client: PublicClient;
  userAddress: Address;
  executor: PrivateKeyAccount;
}): Promise<SmartAccount> {
  return toSmartAccount({
    client,
    entryPoint: { abi: entryPoint08Abi, address: entryPoint08Address, version: '0.8' },
    getAddress: async () => userAddress,
    encodeCalls: async (calls) =>
      encodeExecute(calls.map((call) => ({ to: call.to, value: call.value ?? 0n, data: call.data ?? '0x' }))),
    getFactoryArgs: async () => ({ factory: undefined, factoryData: undefined }),
    getStubSignature: async () => STUB_SIGNATURE,
    signMessage: async () => {
      throw new Error('Not supported by the executor account');
    },
    signTypedData: async () => {
      throw new Error('Not supported by the executor account');
    },
    signUserOperation: async (parameters) => {
      const { chainId = client.chain?.id, ...userOperation } = parameters;
      if (!chainId) {
        throw new Error('Chain id is required to sign a user operation');
      }
      const hash = getUserOperationHash({
        chainId,
        entryPointAddress: entryPoint08Address,
        entryPointVersion: '0.8',
        userOperation: { ...userOperation, sender: userAddress },
      });
      return executor.sign({ hash });
    },
  });
}
