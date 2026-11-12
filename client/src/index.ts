import { balance } from './commands/balance.js';
import { createWallet } from './commands/create-wallet.js';
import { delegate, revoke } from './commands/executor.js';
import { mint } from './commands/mint.js';

const [command, arg] = process.argv.slice(2);

const commands: Record<string, () => Promise<void>> = {
  'create-wallet': createWallet,
  mint: () => mint(arg),
  balance,
  delegate: () => delegate(arg),
  revoke: () => revoke(arg),
};

const run = command ? commands[command] : undefined;
if (!run) {
  console.error(`Usage: <${Object.keys(commands).join('|')}> [arg]`);
  process.exit(1);
}

run().then(
  () => process.exit(0),
  (error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  },
);
