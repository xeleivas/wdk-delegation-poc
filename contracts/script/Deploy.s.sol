// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {ExecutorDelegation} from "../src/ExecutorDelegation.sol";
import {MockERC20} from "../src/MockERC20.sol";

contract Deploy is Script {
    function run() external {
        vm.startBroadcast(vm.envUint("DEPLOYER_PRIVATE_KEY"));
        ExecutorDelegation delegation = new ExecutorDelegation();
        MockERC20 token = new MockERC20();
        vm.stopBroadcast();

        console.log("DELEGATION_ADDRESS", address(delegation));
        console.log("MOCK_TOKEN_ADDRESS", address(token));
    }
}
