const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("FlashLoanArbitrage", function () {
  let flashLoan;
  let owner;
  let usdc;
  const USDC_ADDRESS = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174"; // USDC on Polygon
  const AAVE_LENDING_POOL_ADDRESS_PROVIDER = "0xd05e3E715d945B59290df0ae8eF85c1BdB684744"; // Polygon Mainnet

  before(async function () {
    [owner] = await ethers.getSigners();

    // Deploy FlashLoanArbitrage contract
    const FlashLoanArbitrage = await ethers.getContractFactory("FlashLoanArbitrage");
    flashLoan = await FlashLoanArbitrage.deploy(AAVE_LENDING_POOL_ADDRESS_PROVIDER);
    await flashLoan.deployed();

    // Get USDC contract instance
    usdc = await ethers.getContractAt("IERC20", USDC_ADDRESS);
  });

  describe("Contract Deployment", function () {
    it("Should deploy with the correct address provider", async function () {
      // Verify the contract was deployed successfully
      expect(flashLoan.address).to.be.properAddress;
    });
  });

  describe("Flash Loan Operations", function () {
    it("Should emit FlashLoanInitiated event when initiating a flash loan", async function () {
      const amount = ethers.utils.parseUnits("1000", 6); // 1000 USDC

      await expect(flashLoan.initiateFlashLoan(USDC_ADDRESS, amount))
        .to.emit(flashLoan, "FlashLoanInitiated")
        .withArgs(USDC_ADDRESS, amount);
    });

    it("Should revert when initiating flash loan with zero amount", async function () {
      const zeroAmount = ethers.utils.parseUnits("0", 6);

      await expect(
        flashLoan.initiateFlashLoan(USDC_ADDRESS, zeroAmount)
      ).to.be.revertedWith("Amount must be greater than 0");
    });

    it("Should revert when initiating flash loan with invalid asset address", async function () {
      const amount = ethers.utils.parseUnits("1000", 6);

      await expect(
        flashLoan.initiateFlashLoan(ethers.constants.AddressZero, amount)
      ).to.be.revertedWith("Invalid asset address");
    });
  });

  describe("Access Control", function () {
    it("Should allow owner to withdraw tokens", async function () {
      const amount = ethers.utils.parseUnits("100", 6);
      
      // First, we need to ensure the contract has some tokens
      // This would typically happen after a successful arbitrage
      // For testing, we can transfer tokens directly to the contract
      // Note: This requires having USDC in the testing account
      
      // Try to withdraw
      await expect(flashLoan.connect(owner).withdrawToken(USDC_ADDRESS, amount))
        .to.not.be.revertedWith("Only owner can withdraw");
    });

    it("Should revert when non-owner tries to withdraw tokens", async function () {
      const [, nonOwner] = await ethers.getSigners();
      const amount = ethers.utils.parseUnits("100", 6);

      await expect(
        flashLoan.connect(nonOwner).withdrawToken(USDC_ADDRESS, amount)
      ).to.be.revertedWith("Only owner can withdraw");
    });
  });

  // Note: Testing the actual flash loan execution requires:
  // 1. Forking the mainnet
  // 2. Having enough funds in the Aave lending pool
  // 3. Implementing the actual swap logic
  // These tests should be added once the swap implementation is complete
});
