import { encodeFunctionData, isAddress, type Address } from 'viem';
import { delegationAbi } from '../abi.js';
import { loadAccount } from '../wallet.js';

async function sendOwnerOp(functionName: 'addExecutor' | 'removeExecutor', executorArg: string | undefined) {
  if (!executorArg || !isAddress(executorArg)) {
    throw new Error(`Usage: ${functionName === 'addExecutor' ? 'delegate' : 'revoke'} <executorAddress>`);
  }
  const account = await loadAccount();
  const user = (await account.getAddress()) as Address;
  const { hash } = await account.sendTransaction({
    to: user,
    value: 0,
    data: encodeFunctionData({ abi: delegationAbi, functionName, args: [executorArg] }),
  });
  console.log('userOp hash:', hash);
  const receipt = await account.waitForTransaction(hash);
  console.log('receipt:', JSON.stringify(receipt, (_, v) => (typeof v === 'bigint' ? v.toString() : v), 2));
}

export function delegate(executorArg: string | undefined): Promise<void> {
  return sendOwnerOp('addExecutor', executorArg);
}

export function revoke(executorArg: string | undefined): Promise<void> {
  return sendOwnerOp('removeExecutor', executorArg);
}
