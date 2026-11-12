import { type Address } from 'viem';
import { tokenAbi } from '../abi.js';
import { createPublic } from '../clients.js';
import { requireAddressEnv } from '../config.js';
import { loadAccount } from '../wallet.js';

export async function balance(): Promise<void> {
  const address = (await (await loadAccount()).getAddress()) as Address;
  const publicClient = createPublic();
  const [tokens, eth] = await Promise.all([
    publicClient.readContract({
      address: requireAddressEnv('MOCK_TOKEN_ADDRESS'),
      abi: tokenAbi,
      functionName: 'balanceOf',
      args: [address],
    }),
    publicClient.getBalance({ address }),
  ]);
  console.log(`address ${address}\ntoken balance (base units) ${tokens}\neth balance (wei) ${eth}`);
}
