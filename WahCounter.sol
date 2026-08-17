// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title WahCounter
 * @dev A highly optimized, minimal contract to track on-chain "Wah!" claps.
 */
contract WahCounter {
    // Stores the total number of Wahs globally
    uint256 public totalWahs;

    // Event emitted when a Wah is added, useful for frontend indexing
    event WahAdded(address indexed user, uint256 newTotal);

    /**
     * @dev Increments the totalWahs counter by 1.
     * Uses unchecked block to save gas since overflow is practically impossible.
     */
    function addWah() external {
        unchecked {
            totalWahs += 1;
        }
        emit WahAdded(msg.sender, totalWahs);
    }
}
