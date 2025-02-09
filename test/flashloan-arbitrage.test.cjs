const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("FlashLoanArbitrage", function () {
  let flashLoanContract;
  let aavePool;
  let poolAddressesProvider;
  let usdc;
  let weth;
  let owner;

  before(async function () {
    [owner] = await ethers.getSigners();
    console.log("Testing with owner address:", owner.address);

    try {
      // Deploy mock tokens
      console.log("Deploying mock tokens...");
      const MockERC20 = await ethers.getContractFactory("MockERC20");
      
      console.log("Deploying USDC...");
      const usdcContract = await MockERC20.deploy("USDC", "USDC", 6);
      usdc = await usdcContract.waitForDeployment();
      console.log("USDC deployed at:", await usdc.getAddress());

      console.log("Deploying WETH...");
      const wethContract = await MockERC20.deploy("WETH", "WETH", 18);
      weth = await wethContract.waitForDeployment();
      console.log("WETH deployed at:", await weth.getAddress());

      // First deploy the provider with a temporary pool address
      console.log("Deploying MockPoolAddressesProvider...");
      const MockPoolAddressesProvider = await ethers.getContractFactory("MockPoolAddressesProvider");
      const providerContract = await MockPoolAddressesProvider.deploy(ethers.ZeroAddress);
      poolAddressesProvider = await providerContract.waitForDeployment();
      const providerAddress = await poolAddressesProvider.getAddress();
      console.log("MockPoolAddressesProvider deployed at:", providerAddress);

      // Now deploy the pool
      console.log("Deploying MockAavePool...");
      const MockAavePool = await ethers.getContractFactory("MockAavePool");
      const poolContract = await MockAavePool.deploy(providerAddress);
      aavePool = await poolContract.waitForDeployment();
      const poolAddress = await aavePool.getAddress();
      console.log("MockAavePool deployed at:", poolAddress);

      // Update the pool address in the provider
      console.log("Setting pool address in provider...");
      await poolAddressesProvider.setPoolImpl(poolAddress);

      // Verify the pool address was set correctly
      const setPoolAddress = await poolAddressesProvider.getPool();
      console.log("Provider pool address set to:", setPoolAddress);
      expect(setPoolAddress).to.equal(poolAddress);

      // Deploy FlashLoanArbitrage
      console.log("Deploying FlashLoanArbitrage...");
      const FlashLoanArbitrage = await ethers.getContractFactory("FlashLoanArbitrage");
      const arbitrageContract = await FlashLoanArbitrage.deploy(providerAddress);
      flashLoanContract = await arbitrageContract.waitForDeployment();
      console.log("FlashLoanArbitrage deployed at:", await flashLoanContract.getAddress());

      // Mint initial tokens to AavePool first (important for flash loans)
      console.log("Minting tokens to AavePool...");
      await usdc.mint(poolAddress, ethers.parseUnits("100000", 6));
      await weth.mint(poolAddress, ethers.parseUnits("1000", 18));

      // Mint tokens to FlashLoanArbitrage contract
      console.log("Minting tokens to FlashLoanArbitrage...");
      await usdc.mint(await flashLoanContract.getAddress(), ethers.parseUnits("1000", 6));
      await weth.mint(await flashLoanContract.getAddress(), ethers.parseUnits("10", 18));

      // Approve tokens for flash loan repayment
      const flashLoanAddress = await flashLoanContract.getAddress();
      await usdc.connect(owner).approve(poolAddress, ethers.MaxUint256);
      await weth.connect(owner).approve(poolAddress, ethers.MaxUint256);
      await usdc.connect(owner).approve(flashLoanAddress, ethers.MaxUint256);
      await weth.connect(owner).approve(flashLoanAddress, ethers.MaxUint256);

      console.log("Test setup completed successfully");
    } catch (error) {
      console.error("Error during setup:", error);
      throw error;
    }
  });

  it("Should execute flash loan and arbitrage", async function () {
    console.log("Testing flash loan execution...");
    
    const loanAmount = ethers.parseUnits("100", 6); // 100 USDC
    const usdcAddress = await usdc.getAddress();
    const wethAddress = await weth.getAddress();
    
    // Update opportunity parameters using fixed-size array
    const route = [usdcAddress, wethAddress, usdcAddress];
    const profit = ethers.parseUnits("0.1", 6); // 0.1 USDC profit
    const profitPercentage = 1000; // 1%
    
    console.log("Updating opportunity parameters...");
    await flashLoanContract.updateOpportunity(
      route,
      profit,
      profitPercentage,
      "0x", // Mock swap data
      "0x"  // Mock swap data
    );
    
    // Execute flash loan and check for FlashLoanInitiated event
    console.log("Executing flash loan...");
    await expect(flashLoanContract.initiateFlashLoan(usdcAddress, loanAmount))
      .to.emit(flashLoanContract, "FlashLoanInitiated")
      .withArgs(usdcAddress, loanAmount);
    
    console.log("FlashLoanInitiated event was successfully emitted.");
    
    // Additional assertions (e.g., balance checks) can be added here if needed.
  });

  it("Should update opportunity parameters correctly", async function () {
    console.log("Testing opportunity update...");
    
    const usdcAddress = await usdc.getAddress();
    const wethAddress = await weth.getAddress();
    
    // Use fixed-size array for route
    const route = [usdcAddress, wethAddress, usdcAddress];
    const profit = ethers.parseUnits("0.1", 6);
    const profitPercentage = 1000; // 1%
    
    await expect(
      flashLoanContract.updateOpportunity(
        route,
        profit,
        profitPercentage,
        "0x", // Mock swap data
        "0x"  // Mock swap data
      )
    ).to.emit(flashLoanContract, "OpportunityFound")
      .withArgs(
        [usdcAddress, wethAddress, usdcAddress],
        profit,
        0,
        0,
        profitPercentage
      );

    // Verify that stored values are correct
    const storedRoute = await flashLoanContract.currentRoute(0);
    expect(storedRoute).to.equal(usdcAddress);
    
    const storedProfit = await flashLoanContract.currentProfit();
    expect(storedProfit).to.equal(profit);
    
    const hasOpportunity = await flashLoanContract.hasOpportunity();
    expect(hasOpportunity).to.be.true;
  });
});
