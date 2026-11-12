import { createSeedFile, loadAccount } from '../wallet.js';

export async function createWallet(): Promise<void> {
  createSeedFile();
  const account = await loadAccount();
  console.log('User wallet address:', await account.getAddress());
}
