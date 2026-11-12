import { BadGatewayException, BadRequestException, Injectable, Logger } from '@nestjs/common';
import { parseAbi, type Address, type Hex } from 'viem';
import { UserOperationReceiptNotFoundError } from 'viem/account-abstraction';
import { CreateTransferDto } from './dtos/create-transfer.dto';
import { TransfersClients } from './transfers-clients';
import { encodeTransferCall } from './utils/encode-transfer';

const delegationAbi = parseAbi(['function isExecutor(address executor) view returns (bool)']);

export interface DelegationStatus {
  delegated: boolean;
  executorRegistered: boolean;
}

export type TransferStatus =
  | { status: 'pending' }
  | { status: 'included'; success: boolean; transactionHash: Hex };

@Injectable()
export class TransfersService {
  private readonly logger = new Logger(TransfersService.name);

  constructor(private readonly clients: TransfersClients) {}

  async getDelegation(userAddress: Address): Promise<DelegationStatus> {
    const code = await this.clients.publicClient.getCode({ address: userAddress });
    const designator = `0xef0100${this.clients.delegationAddress.slice(2)}`.toLowerCase();
    if (code?.toLowerCase() !== designator) {
      return { delegated: false, executorRegistered: false };
    }
    const executorRegistered = await this.clients.publicClient.readContract({
      address: userAddress,
      abi: delegationAbi,
      functionName: 'isExecutor',
      args: [this.clients.executorAddress],
    });
    return { delegated: true, executorRegistered };
  }

  async createTransfer(dto: CreateTransferDto): Promise<{ userOpHash: Hex }> {
    const userAddress = dto.userAddress as Address;
    const { delegated, executorRegistered } = await this.getDelegation(userAddress);
    if (!delegated || !executorRegistered) {
      throw new BadRequestException('User has not delegated to the executor');
    }

    const account = await this.clients.getExecutorAccount(userAddress);
    try {
      const userOpHash = await this.clients.bundlerClient.sendUserOperation({
        account,
        calls: [encodeTransferCall(dto.token as Address, dto.to as Address, BigInt(dto.amount))],
      });
      return { userOpHash };
    } catch (error) {
      this.logger.error(`Bundler rejected the user operation: ${error instanceof Error ? error.message : error}`);
      throw new BadGatewayException('Failed to submit the user operation');
    }
  }

  async getTransfer(userOpHash: Hex): Promise<TransferStatus> {
    try {
      const receipt = await this.clients.bundlerClient.getUserOperationReceipt({ hash: userOpHash });
      return { status: 'included', success: receipt.success, transactionHash: receipt.receipt.transactionHash };
    } catch (error) {
      if (error instanceof UserOperationReceiptNotFoundError) {
        return { status: 'pending' };
      }
      throw error;
    }
  }
}
