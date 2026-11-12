// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {PackedUserOperation} from "account-abstraction/interfaces/PackedUserOperation.sol";
import {ExecutorDelegation} from "../src/ExecutorDelegation.sol";
import {MockERC20} from "../src/MockERC20.sol";

contract ExecutorDelegationTest is Test {
    address constant ENTRYPOINT = 0x4337084D9E255Ff0702461CF8895CE9E3b5Ff108;
    uint256 constant OWNER_KEY = 0xA11CE;
    uint256 constant EXECUTOR_KEY = 0xB0B;
    uint256 constant STRANGER_KEY = 0xC0FFEE;

    address owner;
    address executor;
    ExecutorDelegation account;
    MockERC20 token;
    bytes32 constant OP_HASH = keccak256("userOp");

    function setUp() public {
        owner = vm.addr(OWNER_KEY);
        executor = vm.addr(EXECUTOR_KEY);
        // simulate the EOA being delegated to ExecutorDelegation
        vm.etch(owner, address(new ExecutorDelegation()).code);
        account = ExecutorDelegation(payable(owner));
        token = new MockERC20();
    }

    function _op(bytes memory callData, uint256 key) internal pure returns (PackedUserOperation memory op) {
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(key, OP_HASH);
        op.callData = callData;
        op.signature = abi.encodePacked(r, s, v);
    }

    function _validate(PackedUserOperation memory op) internal returns (uint256) {
        vm.prank(ENTRYPOINT);
        return account.validateUserOp(op, OP_HASH, 0);
    }

    function _transferCall(address to, uint256 amount) internal view returns (bytes memory) {
        return abi.encodeCall(account.execute, (address(token), 0, abi.encodeCall(token.transfer, (to, amount))));
    }

    function _registerExecutor() internal {
        vm.prank(owner);
        account.addExecutor(executor);
    }

    function test_ownerSignature_valid() public {
        assertEq(_validate(_op(_transferCall(address(1), 5), OWNER_KEY)), 0);
        bytes memory approveCall =
            abi.encodeCall(account.execute, (address(token), 0, abi.encodeCall(token.approve, (address(1), 5))));
        assertEq(_validate(_op(approveCall, OWNER_KEY)), 0);
    }

    function test_registeredExecutor_transfer_valid() public {
        _registerExecutor();
        assertEq(_validate(_op(_transferCall(address(1), 5), EXECUTOR_KEY)), 0);
    }

    function test_registeredExecutor_otherSelector_invalid() public {
        _registerExecutor();
        bytes memory approveCall =
            abi.encodeCall(account.execute, (address(token), 0, abi.encodeCall(token.approve, (address(1), 5))));
        assertEq(_validate(_op(approveCall, EXECUTOR_KEY)), 1);
    }

    function test_registeredExecutor_nonZeroValue_invalid() public {
        _registerExecutor();
        bytes memory call =
            abi.encodeCall(account.execute, (address(token), 1, abi.encodeCall(token.transfer, (address(1), 5))));
        assertEq(_validate(_op(call, EXECUTOR_KEY)), 1);
    }

    function test_registeredExecutor_executeBatch_invalid() public {
        _registerExecutor();
        bytes memory inner = abi.encodeCall(token.transfer, (address(1), 5));
        bytes memory encodedBatch = abi.encodeWithSignature(
            "executeBatch((address,uint256,bytes)[])", _singleCallArray(address(token), inner)
        );
        assertEq(_validate(_op(encodedBatch, EXECUTOR_KEY)), 1);
    }

    function test_registeredExecutor_addExecutorCall_invalid() public {
        _registerExecutor();
        bytes memory call =
            abi.encodeCall(account.execute, (owner, 0, abi.encodeCall(account.addExecutor, (address(0xBAD)))));
        assertEq(_validate(_op(call, EXECUTOR_KEY)), 1);
    }

    function test_unregisteredSigner_invalid() public {
        assertEq(_validate(_op(_transferCall(address(1), 5), STRANGER_KEY)), 1);
        // registered executors do not make other signers valid
        _registerExecutor();
        assertEq(_validate(_op(_transferCall(address(1), 5), STRANGER_KEY)), 1);
    }

    function test_removeExecutor_thenSameOp_invalid() public {
        _registerExecutor();
        PackedUserOperation memory op = _op(_transferCall(address(1), 5), EXECUTOR_KEY);
        assertEq(_validate(op), 0);

        vm.prank(owner);
        account.removeExecutor(executor);
        assertFalse(account.isExecutor(executor));
        assertEq(_validate(op), 1);
    }

    function test_addExecutor_onlySelf() public {
        vm.expectRevert();
        vm.prank(executor);
        account.addExecutor(executor);
    }

    function test_removeExecutor_onlySelf() public {
        _registerExecutor();
        vm.expectRevert();
        vm.prank(executor);
        account.removeExecutor(executor);
    }

    struct Call {
        address target;
        uint256 value;
        bytes data;
    }

    function _singleCallArray(address target, bytes memory data) internal pure returns (Call[] memory calls) {
        calls = new Call[](1);
        calls[0] = Call(target, 0, data);
    }
}
