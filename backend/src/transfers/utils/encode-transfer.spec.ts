import { decodeFunctionData, parseAbi, type Address } from 'viem';
import { encodeExecute, encodeTransferCall } from './encode-transfer';

const TOKEN: Address = '0x1111111111111111111111111111111111111111';
const RECIPIENT: Address = '0x2222222222222222222222222222222222222222';

describe('encodeTransferCall', () => {
  it('encodes an ERC20 transfer with value 0 targeting the token', () => {
    const call = encodeTransferCall(TOKEN, RECIPIENT, 1_000_000n);

    expect(call.to).toBe(TOKEN);
    expect(call.value).toBe(0n);
    expect(call.data.startsWith('0xa9059cbb')).toBe(true);
    expect(call.data.slice(10, 74)).toBe(RECIPIENT.slice(2).padStart(64, '0'));
    expect(BigInt(`0x${call.data.slice(74)}`)).toBe(1_000_000n);
  });
});

describe('encodeExecute', () => {
  const executeAbi = parseAbi(['function execute(address target, uint256 value, bytes data)']);

  it('encodes a single call as execute(target, value, data)', () => {
    const call = encodeTransferCall(TOKEN, RECIPIENT, 5n);
    const decoded = decodeFunctionData({ abi: executeAbi, data: encodeExecute([call]) });

    expect(decoded.functionName).toBe('execute');
    expect(decoded.args).toEqual([TOKEN, 0n, call.data]);
  });

  it('rejects batches because the executor may only send a single transfer', () => {
    const call = encodeTransferCall(TOKEN, RECIPIENT, 5n);
    expect(() => encodeExecute([call, call])).toThrow();
  });
});
