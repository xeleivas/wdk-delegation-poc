# WDK + EIP-7702 delegation POC

Can a backend holding only an executor key move a WDK user's ERC20 tokens through a custom EIP-7702 delegation contract (Sepolia, gasless)?

**Result: yes.** A WDK-generated wallet delegated once, gaslessly, to a custom contract. The backend then transferred the user's tokens with only its executor key, and the user revoked that permission afterwards.

- `contracts/` Foundry: `ExecutorDelegation`, `MockERC20`
- `client/` Node CLI using `@tetherto/wdk-wallet-evm-7702-gasless`
- `backend/` slim NestJS executor service

## What was run on Sepolia

1. Deployed `ExecutorDelegation` and `MockERC20`.
2. `create-wallet`, then `mint`: the user held 1000 tokens and 0 ETH.
3. `delegate <executor>`: one owner-signed gasless UserOp carrying the 7702 authorization and `addExecutor`. The backend reported `delegated: true, executorRegistered: true`.
4. `POST /transfers` for 1 token: included with `success: true`. The user's balance dropped to 999 tokens and stayed at 0 ETH.
5. `negative-check`: an executor-signed `approve` was rejected by the bundler (`account signature check failed`).
6. `revoke <executor>`: owner-signed `removeExecutor` UserOp, `success: true`. The backend then reported `executorRegistered: false` and `POST /transfers` returned 400.

Not exercised on chain: hard revoke (type-4 transaction to `address(0)`), and an executor-signed `transfer` submitted directly to the bundler after revoke (the backend rejects it first; the contract-level behavior is covered by `test_removeExecutor_thenSameOp_invalid`).

## Findings

**What the delegation contract needed**
- An executor registry stored in the user's EOA, in an ERC-7201 namespaced slot so it cannot collide with other delegations. `addExecutor` and `removeExecutor` are callable only by the account itself, so only an owner-signed UserOp can change them.
- An override of `_validateSignature` that accepts the owner, or a registered executor only when `callData` is a single `execute(token, 0, transfer(address,uint256))`. `executeBatch`, other selectors, non-zero value and self-calls are rejected.
- Everything else is inherited from `Simple7702Account` (EntryPoint v0.8), so UserOp encoding and hashing match what WDK already produces.

**What WDK could and could not do**
- `delegationAddress` accepted the custom contract with no compatibility check, and WDK attached the 7702 authorization automatically on the first op.
- WDK has no concept of a second party: every UserOp is signed with the owner key, and it has no revoke API. Soft revoke worked by sending `removeExecutor` through `sendTransaction`.
- In WDK the signing key and the sender address are the same account. The backend needs the user's address as sender and the executor key as signer, so it builds its UserOps with viem instead.

**What the backend needed beyond WDK**
- viem's `viem/account-abstraction`: `toSmartAccount` for a custom account at the user's address, signed by the executor key, plus a bundler client and an ERC-7677 paymaster client against Candide. No 7702 authorization is attached because the EOA is already delegated.

## Production considerations

- Make the executor policy configurable and access-controlled instead of hard-coded. Only executors approved by an admin should be accepted (a user's `addExecutor` should reject any address that is not on the admin's allowlist), and the permitted methods should be restricted and configurable per executor rather than fixed to `transfer`, optionally narrowed further by target contract or recipient (for example a single treasury address). This POC hard-codes the selector and lets a user register any address.
- Admin changes (allowing or disallowing executors, changing permitted methods) should be made by a Safe multisig. Keeping this policy in a shared registry contract owned by the Safe, and read by the delegation contract, lets one admin change apply to every user instead of editing each user's storage.
- Replace the plain `bool` registry with scoped permissions: per grant, a target contract, function selector, spend limit and expiry. Prefer an existing standard over a custom registry: ERC-7579 modular-account validators (session-key style modules), or ERC-7715 permission requests with ERC-7710 signed delegations, which are checked on use and need no on-chain grant transaction per user.
- Keep the executor key in a managed signer (KMS or HSM). Rotating it means a new owner-signed UserOp per user (`removeExecutor` then `addExecutor`).
- Audit the delegation contract. Its code runs as the user's account, so a flaw in its access rules can expose the user's funds.

## Usage

Requirements: Node 22+, pnpm, [Foundry](https://getfoundry.sh), a Sepolia RPC URL, a Sepolia-funded deployer key, and a [Candide](https://candide.dev) API key with a Sepolia gas policy that has balance.

```bash
git submodule update --init --recursive && pnpm install
cp .env.example .env    # fill in everything except DELEGATION_ADDRESS and MOCK_TOKEN_ADDRESS
```

Private keys are 0x-prefixed. The executor key needs no ETH because the paymaster pays gas.

**Deploy** (copy the two printed addresses into `.env`)

```bash
source .env
cd contracts && forge test
forge script script/Deploy.s.sol --rpc-url $BLOCKCHAIN_RPC_URL --broadcast --gas-estimate-multiplier 800
cd ..
```

**Delegate**

```bash
pnpm --filter client start create-wallet          # prints the user address
pnpm --filter client start mint 1000000000        # 1000 test tokens (6 decimals)
cast wallet address --private-key $EXECUTOR_PRIVATE_KEY    # executor address
pnpm --filter client start delegate <executorAddress>
```

**Transfer** (backend on port 3000)

```bash
pnpm --filter backend build && pnpm --filter backend start

curl localhost:3000/delegations/<userAddress>
curl -X POST localhost:3000/transfers -H "content-type: application/json" \
  -d '{"userAddress":"<userAddress>","token":"<tokenAddress>","to":"<recipient>","amount":"1000000"}'
curl localhost:3000/transfers/<userOpHash>
```

**Revoke**

```bash
pnpm --filter client start revoke <executorAddress>
pnpm --filter backend negative-check <userAddress> <tokenAddress>   # executor-signed approve must be rejected
```

After the revoke, `POST /transfers` returns 400.
