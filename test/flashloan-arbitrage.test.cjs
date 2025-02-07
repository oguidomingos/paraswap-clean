const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("FlashLoanArbitrage", function () {
  let flashLoan, owner, otherAccount;
  let mockUsdc, mockWeth, mockPool, mockProvider;
  let usdcDecimals = 6;
  let wethDecimals = 18;

  before(async function () {
    [owner, otherAccount] = await ethers.getSigners();

    // Deploy mock tokens
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockUsdc = await MockERC20.deploy("USDC", "USDC", usdcDecimals);
    mockWeth = await MockERC20.deploy("WETH", "WETH", wethDecimals);

    // Deploy mock pool
    const MockAavePool = await ethers.getContractFactory("MockAavePool");
    mockPool = await MockAavePool.deploy(owner.address);

    // Deploy mock provider
    const MockPoolAddressesProvider = await ethers.getContractFactory("MockPoolAddressesProvider");
    mockProvider = await MockPoolAddressesProvider.deploy(await mockPool.getAddress(), "Mock Aave Market");

    // Deploy FlashLoanArbitrage contract
    const FlashLoanArbitrage = await ethers.getContractFactory("FlashLoanArbitrage");
    flashLoan = await FlashLoanArbitrage.deploy(await mockProvider.getAddress());

    // Mint tokens for testing
    const testAmount = ethers.parseUnits("100000", usdcDecimals);
    await mockUsdc.mint(owner.address, testAmount);
    await mockUsdc.mint(await mockPool.getAddress(), testAmount);
    await mockWeth.mint(owner.address, ethers.parseUnits("100", wethDecimals));
    await mockWeth.mint(await mockPool.getAddress(), ethers.parseUnits("100", wethDecimals));

    // Approve tokens
    await mockUsdc.approve(await flashLoan.getAddress(), ethers.MaxUint256);
    await mockUsdc.approve(await mockPool.getAddress(), ethers.MaxUint256);
    await mockWeth.approve(await flashLoan.getAddress(), ethers.MaxUint256);
    await mockWeth.approve(await mockPool.getAddress(), ethers.MaxUint256);
  });

  describe("Deployment", function () {
    it("Should be deployed with the correct provider address", async function () {
      expect(await flashLoan.ADDRESSES_PROVIDER()).to.equal(await mockProvider.getAddress());
    });

    it("Should start with zero USDC balance", async function () {
      const balance = await mockUsdc.balanceOf(await flashLoan.getAddress());
      expect(balance).to.equal(0);
    });
  });

  describe("Flash Loan Operations", function () {
    it("Should emit event when initiating flash loan", async function () {
      const amount = ethers.parseUnits("1000", usdcDecimals);
      
      // Set up opportunity first
      await flashLoan.updateOpportunity(
        [await mockUsdc.getAddress(), await mockWeth.getAddress(), await mockUsdc.getAddress()],
        ethers.parseUnits("50", usdcDecimals), // 50 USDC profit
        200, // 0.02% profit
        "0x", // Mock swap data
        "0x"  // Mock swap data
      );

      await expect(flashLoan.initiateFlashLoan(await mockUsdc.getAddress(), amount))
        .to.emit(flashLoan, "FlashLoanInitiated")
        .withArgs(await mockUsdc.getAddress(), amount);
    });

    it("Should reject flash loan with zero amount", async function () {
      await expect(
        flashLoan.initiateFlashLoan(await mockUsdc.getAddress(), 0)
      ).to.be.revertedWith("Amount must be greater than 0");
    });

    it("Should execute flash loan with arbitrage route and emit events", async function () {
      const amount = ethers.parseUnits("1000", usdcDecimals);
      
      // Simulate arbitrage route: USDC -> WETH -> USDC
      const swapRoute = {
        path: [await mockUsdc.getAddress(), await mockWeth.getAddress(), await mockUsdc.getAddress()],
        amounts: [
          amount,
          ethers.parseUnits("0.5", 18), // Convert to 0.5 WETH
          ethers.parseUnits("1050", 6)  // Return 1050 USDC (5% profit)
        ]
      };

      // Prepare mock swap data that matches ParaSwap format
      const mockSwapData = ethers.AbiCoder.defaultAbiCoder().encode(
        ['address', 'uint256', 'bytes'],
        [await mockWeth.getAddress(), ethers.parseUnits("0.5", 18), "0x"]
      );

      // Update opportunity with valid swap data
      await flashLoan.updateOpportunity(
        [await mockUsdc.getAddress(), await mockWeth.getAddress(), await mockUsdc.getAddress()],
        ethers.parseUnits("50", usdcDecimals), // 50 USDC profit
        200, // 0.02% profit
        mockSwapData,
        mockSwapData
      );

      // Execute flash loan
      await expect(flashLoan.initiateFlashLoan(await mockUsdc.getAddress(), amount))
        .to.emit(flashLoan, "FlashLoanInitiated")
        .withArgs(await mockUsdc.getAddress(), amount)
        .and.to.emit(flashLoan, "SwapExecuted")
        .withArgs(await mockUsdc.getAddress(), await mockWeth.getAddress(), amount, ethers.parseUnits("0.5", 18))
        .and.to.emit(flashLoan, "SwapExecuted")
        .withArgs(await mockWeth.getAddress(), await mockUsdc.getAddress(), ethers.parseUnits("0.5", 18), ethers.parseUnits("1050", 6))
        .and.to.emit(flashLoan, "ArbitrageExecuted");
    });

    it("Should reject flash loans without opportunity", async function () {
      const amount = ethers.parseUnits("1000", usdcDecimals);
      
      // Reset opportunity
      await flashLoan.updateOpportunity(
        [ethers.ZeroAddress, ethers.ZeroAddress, ethers.ZeroAddress],
        0,
        0,
        "0x",
        "0x"
      );

      await expect(
        flashLoan.initiateFlashLoan(await mockUsdc.getAddress(), amount)
      ).to.be.revertedWith("No opportunity set");
    });
  });
});
