import 'reflect-metadata';
import { ConfigService } from '@nestjs/config';
import { encodeFunctionData, isAddress, parseAbi, type Address } from 'viem';
import { baseConfig } from '../src/config/base.config';
import { TransfersClients } from '../src/transfers/transfers-clients';

try {
  process.loadEnvFile('../.env');
} catch {
  // env vars may already be set in the shell
}

async function main(): Promise<void> {
  const [userArg, tokenArg] = process.argv.slice(2);
  if (!userArg || !tokenArg || !isAddress(userArg) || !isAddress(tokenArg)) {
    throw new Error('Usage: negative-check <userAddress> <tokenAddress>');
  }
  const clients = new TransfersClients(new ConfigService({ base: baseConfig() }));
  const account = await clients.getExecutorAccount(userArg as Address);
  const approve = encodeFunctionData({
    abi: parseAbi(['function approve(address spender, uint256 amount)']),
    functionName: 'approve',
    args: [clients.executorAddress, 1n],
  });

  try {
    await clients.bundlerClient.sendUserOperation({
      account,
      calls: [{ to: tokenArg as Address, value: 0n, data: approve }],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log('PASS: executor-signed approve was rejected:', message.split('\n')[0]);
    return;
  }
  console.error('FAIL: executor-signed approve was accepted');
  process.exit(1);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
