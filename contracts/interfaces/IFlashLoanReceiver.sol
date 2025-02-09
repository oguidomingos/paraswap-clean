// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IFlashLoanReceiver {
    /**
     * @notice Executes an operation after receiving the flash loan.
     * @param assets The addresses of the assets being flash-borrowed.
     * @param amounts The amounts of each asset being borrowed.
     * @param interestRateModes Additional parameters (e.g., interest rate modes or premiums)
     * @param initiator The address that initiated the flash loan.
     * @param params Arbitrary data for the flash loan operation.
     * @return True if the operation succeeds, false otherwise.
     */
    function executeOperation(
       address[] calldata assets,
       uint256[] calldata amounts,
       uint256[] calldata interestRateModes,
       address initiator,
       bytes calldata params
    ) external returns (bool);
}
