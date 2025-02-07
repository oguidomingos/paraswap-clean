const { expect } = require("chai");

describe("FlashLoanArbitrage", function () {
  let flashLoan, owner;

  before(async function () {
    [owner] = await ethers.getSigners();
    const FlashLoanArbitrage = await ethers.getContractFactory("FlashLoanArbitrage");
    // Utilize o addressProvider correto para o teste (Sepolia)
    flashLoan = await FlashLoanArbitrage.deploy("0x2f39d218133AFaB8F2B819B1066C7E434Ad94E9e");
    await flashLoan.deployed();
  });

  it("Deve iniciar um flash loan e executar a operação", async function () {
    // USDC no Sepolia: 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174
    const usdcAddress = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
    const amount = ethers.parseUnits("1000", 6); // 1000 USDC (6 casas decimais)

    // Chame a função de iniciar o flash loan
    await flashLoan.initiateFlashLoan(usdcAddress, amount);
  });
});