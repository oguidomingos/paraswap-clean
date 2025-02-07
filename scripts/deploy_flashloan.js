const hre = require("hardhat");

async function main() {
  console.log("Starting deployment of FlashLoanArbitrage contract...");

  // Address of Aave's LendingPoolAddressesProvider on Polygon
  const AAVE_LENDING_POOL_ADDRESS_PROVIDER = "0xd05e3E715d945B59290df0ae8eF85c1BdB684744";

  // Get contract factory
  const FlashLoanArbitrage = await hre.ethers.getContractFactory("FlashLoanArbitrage");
  
  // Deploy with constructor arguments
  console.log("Deploying FlashLoanArbitrage...");
  const flashLoanContract = await FlashLoanArbitrage.deploy(AAVE_LENDING_POOL_ADDRESS_PROVIDER);

  // Wait for deployment to finish
  await flashLoanContract.deployed();

  console.log("FlashLoanArbitrage deployed to:", flashLoanContract.address);
  console.log("Deployment transaction hash:", flashLoanContract.deployTransaction.hash);

  // Wait for a few block confirmations
  console.log("Waiting for block confirmations...");
  await flashLoanContract.deployTransaction.wait(5);
  console.log("Deployment confirmed with 5 blocks");

  // Verify contract on Etherscan
  if (process.env.POLYGONSCAN_API_KEY) {
    console.log("Verifying contract on Polygonscan...");
    try {
      await hre.run("verify:verify", {
        address: flashLoanContract.address,
        constructorArguments: [AAVE_LENDING_POOL_ADDRESS_PROVIDER],
      });
      console.log("Contract verified successfully");
    } catch (error) {
      console.log("Error verifying contract:", error.message);
    }
  } else {
    console.log("Skipping contract verification - POLYGONSCAN_API_KEY not found");
  }

  // Update the .env file with the contract address (you'll need to implement this)
  console.log("\nRemember to update your .env file with the following:");
  console.log(`FLASHLOAN_CONTRACT_ADDRESS=${flashLoanContract.address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
