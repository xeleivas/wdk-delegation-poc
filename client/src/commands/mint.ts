import { type Address } from 'viem';
import { tokenAbi } from '../abi.js';
import { createDeployerWallet, createPublic } from '../clients.js';
import { requireAddressEnv } from '../config.js';
import { loadAccount } from '../wallet.js';

export async function mint(amountArg: string | undefined): Promise<void> {
  if (!amountArg || !/^[1-9]\d*$/.test(amountArg)) {
    throw new Error('Usage: mint <amount in base units>');
  }
  const user = (await (await loadAccount()).getAddress()) as Address;
  const hash = await createDeployerWallet().writeContract({
    address: requireAddressEnv('MOCK_TOKEN_ADDRESS'),
    abi: tokenAbi,
    functionName: 'mint',
    args: [user, BigInt(amountArg)],
  });
  await createPublic().waitForTransactionReceipt({ hash });
  console.log(`minted ${amountArg} to ${user}, tx ${hash}`);
}
