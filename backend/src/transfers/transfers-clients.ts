import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createPublicClient, http, type Address, type PublicClient } from 'viem';
import { privateKeyToAccount, type PrivateKeyAccount } from 'viem/accounts';
import {
  createBundlerClient,
  createPaymasterClient,
  type BundlerClient,
  type SmartAccount,
} from 'viem/account-abstraction';
import { sepolia } from 'viem/chains';
import { PocConfig } from '../config/poc.config';
import { createExecutorAccount } from './utils/create-executor-account';

@Injectable()
export class TransfersClients {
  readonly publicClient: PublicClient;
  readonly bundlerClient: BundlerClient;
  readonly delegationAddress: Address;
  readonly executorAddress: Address;
  private readonly executor: PrivateKeyAccount;

  constructor(configService: ConfigService) {
    const config = configService.getOrThrow<PocConfig>('poc');
    this.executor = privateKeyToAccount(config.executorPrivateKey);
    this.executorAddress = this.executor.address;
    this.delegationAddress = config.delegationAddress;
    this.publicClient = createPublicClient({ chain: sepolia, transport: http(config.rpcUrl) });
    this.bundlerClient = createBundlerClient({
      client: this.publicClient,
      transport: http(config.bundlerUrl),
      paymaster: createPaymasterClient({ transport: http(config.bundlerUrl) }),
      paymasterContext: config.sponsorshipPolicyId ? { sponsorshipPolicyId: config.sponsorshipPolicyId } : undefined,
    });
  }

  getExecutorAccount(userAddress: Address): Promise<SmartAccount> {
    return createExecutorAccount({ client: this.publicClient, userAddress, executor: this.executor });
  }
}
