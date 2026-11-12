// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Simple7702Account} from "account-abstraction/accounts/Simple7702Account.sol";
import {PackedUserOperation} from "account-abstraction/interfaces/PackedUserOperation.sol";
import {SIG_VALIDATION_FAILED, SIG_VALIDATION_SUCCESS} from "account-abstraction/core/Helpers.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// EIP-7702 delegation target. The owner EOA keeps full control; registered executors
/// can only authorize a single ERC20 `transfer(address,uint256)` call with value 0.
contract ExecutorDelegation is Simple7702Account {
    /// @custom:storage-location erc7201:executor.storage.ExecutorDelegation
    struct Layout {
        mapping(address => bool) executors;
    }

    // ERC-7201 namespaced slot: the storage lives in the user's EOA and must not collide with other delegations.
    bytes32 private constant STORAGE_LOCATION =
        keccak256(abi.encode(uint256(keccak256("executor.storage.ExecutorDelegation")) - 1)) & ~bytes32(uint256(0xff));

    // transfer(address,uint256): 4-byte selector + 2 words
    uint256 private constant TRANSFER_DATA_LENGTH = 68;

    function addExecutor(address executor) external {
        require(msg.sender == address(this), "only self");
        _layout().executors[executor] = true;
    }

    function removeExecutor(address executor) external {
        require(msg.sender == address(this), "only self");
        _layout().executors[executor] = false;
    }

    function isExecutor(address executor) external view returns (bool) {
        return _layout().executors[executor];
    }

    function _validateSignature(PackedUserOperation calldata userOp, bytes32 userOpHash)
        internal
        virtual
        override
        returns (uint256)
    {
        (address signer,,) = ECDSA.tryRecover(userOpHash, userOp.signature);
        if (signer == address(this)) {
            return SIG_VALIDATION_SUCCESS;
        }
        if (signer != address(0) && _layout().executors[signer] && _isTransferCall(userOp.callData)) {
            return SIG_VALIDATION_SUCCESS;
        }
        return SIG_VALIDATION_FAILED;
    }

    function _isTransferCall(bytes calldata callData) internal pure returns (bool) {
        if (callData.length < 4 || bytes4(callData[:4]) != this.execute.selector) {
            return false;
        }
        (, uint256 value, bytes memory data) = abi.decode(callData[4:], (address, uint256, bytes));
        return value == 0 && data.length == TRANSFER_DATA_LENGTH && bytes4(data) == IERC20.transfer.selector;
    }

    function _layout() private pure returns (Layout storage l) {
        bytes32 slot = STORAGE_LOCATION;
        assembly {
            l.slot := slot
        }
    }
}
