import { BadRequestException } from '@nestjs/common';
import type { Address, Hex } from 'viem';
import { UserOperationReceiptNotFoundError } from 'viem/account-abstraction';
import { TransfersClients } from './transfers-clients';
import { TransfersService } from './transfers.service';

const USER: Address = '0x1111111111111111111111111111111111111111';
const TOKEN: Address = '0x2222222222222222222222222222222222222222';
const TO: Address = '0x3333333333333333333333333333333333333333';
const DELEGATION: Address = '0x4444444444444444444444444444444444444444';
const EXECUTOR: Address = '0x5555555555555555555555555555555555555555';
const HASH: Hex = `0x${'ab'.repeat(32)}`;
const DESIGNATOR = `0xef0100${DELEGATION.slice(2)}`;
const ACCOUNT = { stub: 'account' };

function setup(overrides: { code?: Hex | undefined; isExecutor?: boolean } = {}) {
  const publicClient = {
    getCode: jest.fn().mockResolvedValue('code' in overrides ? overrides.code : DESIGNATOR),
    readContract: jest.fn().mockResolvedValue(overrides.isExecutor ?? true),
  };
  const bundlerClient = {
    sendUserOperation: jest.fn().mockResolvedValue(HASH),
    getUserOperationReceipt: jest.fn(),
  };
  const clients = {
    publicClient,
    bundlerClient,
    delegationAddress: DELEGATION,
    executorAddress: EXECUTOR,
    getExecutorAccount: jest.fn().mockResolvedValue(ACCOUNT),
  } as unknown as TransfersClients;
  return { service: new TransfersService(clients), publicClient, bundlerClient, clients };
}

const dto = { userAddress: USER, token: TOKEN, to: TO, amount: '1000000' };

describe('TransfersService.getDelegation', () => {
  it('reports delegated and executor registered', async () => {
    const { service } = setup();
    await expect(service.getDelegation(USER)).resolves.toEqual({ delegated: true, executorRegistered: true });
  });

  it('reports not delegated for an EOA with no code, without reading the contract', async () => {
    const { service, publicClient } = setup({ code: undefined });
    await expect(service.getDelegation(USER)).resolves.toEqual({ delegated: false, executorRegistered: false });
    expect(publicClient.readContract).not.toHaveBeenCalled();
  });

  it('reports not delegated when delegated to a different contract', async () => {
    const { service } = setup({ code: `0xef0100${'99'.repeat(20)}` });
    await expect(service.getDelegation(USER)).resolves.toEqual({ delegated: false, executorRegistered: false });
  });
});

describe('TransfersService.createTransfer', () => {
  it('rejects without calling the bundler when the user is not delegated', async () => {
    const { service, bundlerClient } = setup({ code: undefined });
    await expect(service.createTransfer(dto)).rejects.toBeInstanceOf(BadRequestException);
    expect(bundlerClient.sendUserOperation).not.toHaveBeenCalled();
  });

  it('rejects without calling the bundler when the executor is not registered', async () => {
    const { service, bundlerClient } = setup({ isExecutor: false });
    await expect(service.createTransfer(dto)).rejects.toBeInstanceOf(BadRequestException);
    expect(bundlerClient.sendUserOperation).not.toHaveBeenCalled();
  });

  it('sends one ERC20 transfer through the executor account without a 7702 authorization', async () => {
    const { service, bundlerClient, clients } = setup();

    await expect(service.createTransfer(dto)).resolves.toEqual({ userOpHash: HASH });

    expect(clients.getExecutorAccount).toHaveBeenCalledWith(USER);
    const arg = bundlerClient.sendUserOperation.mock.calls[0][0];
    expect(arg.account).toBe(ACCOUNT);
    expect(arg.calls).toHaveLength(1);
    expect(arg.calls[0].to).toBe(TOKEN);
    expect(arg.calls[0].value).toBe(0n);
    expect(arg.calls[0].data.startsWith('0xa9059cbb')).toBe(true);
    expect(arg).not.toHaveProperty('authorization');
  });
});

describe('TransfersService.getTransfer', () => {
  it('returns pending while the bundler has no receipt', async () => {
    const { service, bundlerClient } = setup();
    bundlerClient.getUserOperationReceipt.mockRejectedValue(new UserOperationReceiptNotFoundError({ hash: HASH }));
    await expect(service.getTransfer(HASH)).resolves.toEqual({ status: 'pending' });
  });

  it('reports success false when the included user operation failed', async () => {
    const { service, bundlerClient } = setup();
    bundlerClient.getUserOperationReceipt.mockResolvedValue({
      success: false,
      receipt: { transactionHash: HASH },
    });
    await expect(service.getTransfer(HASH)).resolves.toEqual({
      status: 'included',
      success: false,
      transactionHash: HASH,
    });
  });

  it('reports success true for a successful user operation', async () => {
    const { service, bundlerClient } = setup();
    bundlerClient.getUserOperationReceipt.mockResolvedValue({
      success: true,
      receipt: { transactionHash: HASH },
    });
    await expect(service.getTransfer(HASH)).resolves.toMatchObject({ status: 'included', success: true });
  });
});
