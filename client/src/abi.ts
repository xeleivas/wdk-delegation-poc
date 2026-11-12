import { parseAbi } from 'viem';

export const delegationAbi = parseAbi([
  'function addExecutor(address executor)',
  'function removeExecutor(address executor)',
  'function isExecutor(address executor) view returns (bool)',
]);

export const tokenAbi = parseAbi([
  'function mint(address to, uint256 amount)',
  'function balanceOf(address account) view returns (uint256)',
]);
