# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A throwaway **proof of concept** (Sepolia testnet only). Question it answers: can a backend that holds only an *executor* key move a Tether WDK user's ERC20 tokens, gaslessly, through a custom EIP-7702 delegation contract, without ever touching the user's key, and can the user revoke that permission?

Keep it a simple POC: no fallbacks, no contingency plans, no hardening, no persistence, no auth. If something fails, record it in the README "Findings" instead of building around it.

Design and plan live in `docs/superpowers/specs/` and `docs/superpowers/plans/` (git-ignored, local only).

## Layout (pnpm workspace + Foundry)

- `contracts/` Foundry project: `ExecutorDelegation` (extends `Simple7702Account`, EntryPoint v0.8), `MockERC20` (6 decimals, open `mint`), deploy script
- `client/` Node CLI using `@tetherto/wdk-wallet-evm-7702-gasless`. The only place the user wallet exists. Commands: `create-wallet`, `mint`, `balance`, `delegate <executor>`, `revoke <executor>`
- `backend/` slim NestJS 11 service. Holds only the executor key and sends ERC20 `transfer` UserOps through Candide
- `backend/scripts/negative-check.ts` proves an executor-signed non-`transfer` op is rejected

## Commands

```bash
source .env

# contracts (run from contracts/)
forge build
forge test                       # all tests
forge test --match-test <name>

# deploy (run from contracts/; contract creation on Sepolia needs far more gas than forge estimates, hence the multiplier)
forge script script/Deploy.s.sol --rpc-url $BLOCKCHAIN_RPC_URL --broadcast --gas-estimate-multiplier 800

# client
pnpm --filter client start <create-wallet|mint|balance|delegate|revoke> [arg]
pnpm --filter client typecheck

# backend
pnpm --filter backend test       # Jest
pnpm --filter backend build
pnpm --filter backend start
pnpm --filter backend negative-check <userAddress> <tokenAddress>
```

## Environment

All config comes from env vars in a git-ignored `.env` at the repo root (see `.env.example`). **Never read `.env` files**; ask the user instead.

`BLOCKCHAIN_RPC_URL`, `CANDIDE_BUNDLER_URL` (bundler and paymaster), `CANDIDE_SPONSORSHIP_POLICY_ID`, `DEPLOYER_PRIVATE_KEY` (setup scripts and `mint` only, never the backend), `EXECUTOR_PRIVATE_KEY` (backend only, holds no ETH), `DELEGATION_ADDRESS`, `MOCK_TOKEN_ADDRESS` (both written after deploy).

## Architecture

- **Delegation:** the user EOA delegates via EIP-7702 to `ExecutorDelegation`. One owner-signed gasless UserOp (sent by the WDK client) carries the 7702 authorization and calls `addExecutor(executor)` on the EOA itself.
- **Validation:** `_validateSignature` accepts the owner, or a registered executor only when `callData` is a single `execute(token, 0, transfer(address,uint256))`. `executeBatch`, other selectors, non-zero value and self-calls are rejected. Executors live in an ERC-7201 namespaced slot.
- **Revoke:** soft only, an owner-signed UserOp calling `removeExecutor`. Hard revoke (type-4 tx to `address(0)`) is out of scope.
- **Backend:** builds the UserOp with viem's `viem/account-abstraction` (`toSmartAccount` custom account at the user's address, signed by the executor key), Candide ERC-7677 paymaster, no 7702 authorization attached. It uses viem instead of WDK because WDK ties the signing key to the sender address.
- **Endpoints:** `POST /transfers`, `GET /transfers/:userOpHash`, `GET /delegations/:userAddress`.

## Conventions

- `pnpm` only. TypeScript strict, no `any`, named exports, early returns, small single-purpose functions.
- Backend: NestJS 11. Use `ConfigService`, never `process.env` in services. DTOs in `dtos/`, one decorated class per file, no barrel index. Never leak internal error details in API responses.
- Code, comments and file names in English. No commented-out code.
- Only change what the task requires; mention unrelated issues instead of fixing them.
- Do not run installs without approval.
- Commits: conventional, single line, no scope, no body, no Co-Authored-By trailer. Do not commit unless asked. Never push.
- Keep this repo free of references to any real product or company (files, names, commit messages).
