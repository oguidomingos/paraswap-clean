const hre = require("hardhat");

async function main() {
  console.log("Deploying FlashLoanArbitrage contract...");

  // Polygon mainnet Aave v3 Pool Addresses Provider
  const AAVE_POOL_ADDRESSES_PROVIDER = "0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb";

  const FlashLoanArbitrage = await hre.ethers.getContractFactory("FlashLoanArbitrage");
  const flashLoan = await FlashLoanArbitrage.deploy(AAVE_POOL_ADDRESSES_PROVIDER);

  await flashLoan.waitForDeployment();
  
  const address = await flashLoan.getAddress();
  console.log(`FlashLoanArbitrage deployed to ${address}`);

  // Verify on Polygonscan for Polygon mainnet deployment
  if (process.env.POLYGONSCAN_API_KEY) {
    console.log("Waiting for 6 block confirmations before verification...");
    
    // Wait for 6 blocks
    await new Promise(resolve => setTimeout(resolve, 60000)); // ~1 minute on Polygon

    console.log("Verifying contract on Polygonscan...");
    await hre.run("verify:verify", {
      address: address,
      constructorArguments: [AAVE_POOL_ADDRESSES_PROVIDER],
    });
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
