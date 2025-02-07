const hre = require("hardhat");

async function main() {
  const FlashLoanArbitrage = await hre.ethers.getContractFactory("FlashLoanArbitrage");
  // Substitua o endereço abaixo pelo addressProvider da Aave na Polygon (ou no fork que você estiver usando)
  // Address Providers Oficiais Aave V3:
   const ADDRESS_PROVIDER = hre.network.name === 'polygon' 
     ? "0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb" // Polygon Mainnet
     : "0x2f39d218133AFaB8F2B819B1066C7E434Ad94E9e"; // Sepolia Testnet
     
  const flashLoanContract = await FlashLoanArbitrage.deploy(ADDRESS_PROVIDER);
  await flashLoanContract.deployed();
  console.log("Contrato FlashLoanArbitrage deployado em:", flashLoanContract.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});