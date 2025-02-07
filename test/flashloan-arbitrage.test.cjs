const { expect } = require("chai");
const { ethers, network } = require("hardhat");

describe("FlashLoanArbitrage", function () {
  let flashLoan, owner;
  let USDC, WETH;
  // Polygon mainnet addresses
  const AAVE_PROVIDER_ADDRESS = "0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb"; // Aave V3 Pool Addresses Provider
  const USDC_ADDRESS = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174"; // USDC on Polygon
  const WETH_ADDRESS = "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619"; // WETH on Polygon
  const AAVE_POOL = "0x794a61358D6845594F94dc1DB02A252b5b4814aD"; // Aave V3 Pool
  const USDC_WHALE = "0x06959153B974D0D5E1a1c0947FF2Ed7324F72c76"; // USDC whale on Polygon

  before(async function () {
    // Increase timeout for forked network operations
    this.timeout(60000);

    [owner] = await ethers.getSigners();

    // Fund the owner account with ETH for gas
    await network.provider.send("hardhat_setBalance", [
      owner.address,
      "0x4EE2D6D415B85ACEF8000000" // 100,000 ETH in hex
    ]);

    // Get contract instances
    USDC = await ethers.getContractAt("IERC20", USDC_ADDRESS);
    WETH = await ethers.getContractAt("IERC20", WETH_ADDRESS);

    // Deploy FlashLoanArbitrage contract
    const FlashLoanArbitrage = await ethers.getContractFactory("FlashLoanArbitrage");
    flashLoan = await FlashLoanArbitrage.deploy(AAVE_PROVIDER_ADDRESS);
    await flashLoan.waitForDeployment();

    // Fund contract with initial USDC
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [USDC_WHALE]
    });

    // Get the whale signer and fund it with ETH for gas
    const whaleSigner = await ethers.getSigner(USDC_WHALE);
    await owner.sendTransaction({
      to: USDC_WHALE,
      value: ethers.parseEther("1.0")
    });

    // Transfer USDC from whale to our contract
    const usdcAmount = ethers.parseUnits("10000", 6); // 10,000 USDC
    await USDC.connect(whaleSigner).transfer(
      await flashLoan.getAddress(),
      usdcAmount
    );

    // Stop impersonating whale
    await network.provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: [USDC_WHALE]
    });

    // Configure the fork to handle flash loans
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [AAVE_POOL]
    });

    const poolSigner = await ethers.getSigner(AAVE_POOL);
    await owner.sendTransaction({
      to: AAVE_POOL,
      value: ethers.parseEther("1.0")
    });

    // Pre-approve USDC spending for flash loans
    await USDC.connect(poolSigner).approve(
      await flashLoan.getAddress(),
      ethers.MaxUint256
    );

    await network.provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: [AAVE_POOL]
    });

    // Reset any pending nonces
    await network.provider.send("hardhat_setNonce", [
      AAVE_POOL,
      "0x0"
    ]);

    await network.provider.send("hardhat_setNonce", [
      USDC_WHALE,
      "0x0"
    ]);
  });

  describe("Deployment", function () {
    it("Should be deployed with the correct provider address", async function () {
      expect(await flashLoan.ADDRESSES_PROVIDER()).to.equal(AAVE_PROVIDER_ADDRESS);
    });

    it("Should have received the initial USDC", async function () {
      const balance = await USDC.balanceOf(await flashLoan.getAddress());
      expect(balance).to.be.gt(0);
    });
  });

  describe("Flash Loan Operations", function () {
    it("Should emit event when initiating flash loan", async function () {
      const amount = ethers.parseUnits("1000", 6); // 1000 USDC
      await expect(flashLoan.initiateFlashLoan(USDC_ADDRESS, amount, "0x"))
        .to.emit(flashLoan, "FlashLoanInitiated")
        .withArgs(USDC_ADDRESS, amount);
    });

    it("Should reject flash loan with zero amount", async function () {
      await expect(
        flashLoan.initiateFlashLoan(USDC_ADDRESS, 0, "0x")
      ).to.be.revertedWith("Amount must be greater than 0");
    });

    it("Should execute flash loan with arbitrage route and emit events", async function () {
      const amount = ethers.parseUnits("1000", 6);
      
      // Simulate arbitrage route: USDC -> WETH -> USDC
      const swapRoute = {
        path: [USDC_ADDRESS, WETH_ADDRESS, USDC_ADDRESS],
        amounts: [
          amount,
          ethers.parseUnits("0.5", 18), // Convert to 0.5 WETH
          ethers.parseUnits("1050", 6)  // Return 1050 USDC (5% profit)
        ]
      };

      // Encode route parameters
      const params = ethers.AbiCoder.defaultAbiCoder().encode(
        ['tuple(address[] path, uint256[] amounts)'],
        [swapRoute]
      );

      // Execute flash loan with route
      await expect(flashLoan.initiateFlashLoan(USDC_ADDRESS, amount, params))
        .to.emit(flashLoan, "FlashLoanInitiated")
        .withArgs(USDC_ADDRESS, amount)
        .and.to.emit(flashLoan, "SwapExecuted")
        .withArgs(USDC_ADDRESS, WETH_ADDRESS, amount, ethers.parseUnits("0.5", 18))
        .and.to.emit(flashLoan, "SwapExecuted")
        .withArgs(WETH_ADDRESS, USDC_ADDRESS, ethers.parseUnits("0.5", 18), ethers.parseUnits("1050", 6))
        .and.to.emit(flashLoan, "ArbitrageExecuted");
    });

    it("Should reject invalid arbitrage routes", async function () {
      const amount = ethers.parseUnits("1000", 6);
      
      // Invalid route with single token
      const invalidRoute = {
        path: [USDC_ADDRESS],
        amounts: [amount]
      };

      const params = ethers.AbiCoder.defaultAbiCoder().encode(
        ['tuple(address[] path, uint256[] amounts)'],
        [invalidRoute]
      );

      await expect(
        flashLoan.initiateFlashLoan(USDC_ADDRESS, amount, params)
      ).to.be.revertedWith("Invalid route path");
    });
  });
});
