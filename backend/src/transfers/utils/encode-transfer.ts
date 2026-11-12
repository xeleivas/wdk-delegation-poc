import { encodeFunctionData, parseAbi, type Address, type Hex } from 'viem';

const erc20Abi = parseAbi(['function transfer(address to, uint256 amount) returns (bool)']);
const executeAbi = parseAbi(['function execute(address target, uint256 value, bytes data)']);

export interface Call {
  to: Address;
  value: bigint;
  data: Hex;
}

export function encodeTransferCall(token: Address, to: Address, amount: bigint): Call {
  return {
    to: token,
    value: 0n,
    data: encodeFunctionData({ abi: erc20Abi, functionName: 'transfer', args: [to, amount] }),
  };
}

export function encodeExecute(calls: readonly Call[]): Hex {
  if (calls.length !== 1) {
    throw new Error('The executor may only send a single call');
  }
  const [call] = calls;
  return encodeFunctionData({
    abi: executeAbi,
    functionName: 'execute',
    args: [call.to, call.value, call.data],
  });
}
