const express = require("express");
const { ethers } = require("ethers");
const router = express.Router();

// Load the contract ABI. Ensure that the contract is compiled and the ABI file exists at the specified path.
const flashLoanArtifact = require("../artifacts/contracts/FlashLoanArbitrage.sol/FlashLoanArbitrage.json");
const flashLoanABI = flashLoanArtifact.abi;

router.post("/execute_flashloan", async (req, res) => {
  try {
    const flashLoanAddress = process.env.FLASHLOAN_CONTRACT_ADDRESS;
    if (!flashLoanAddress) {
      return res.status(400).json({ error: "FlashLoan contract address is not configured in the environment." });
    }

    // Set up the provider and signer using environment variables.
    if (!process.env.POLYGON_RPC || !process.env.PRIVATE_KEY) {
      return res.status(400).json({ error: "POLYGON_RPC and PRIVATE_KEY must be set in the environment." });
    }
    const provider = new ethers.providers.JsonRpcProvider(process.env.POLYGON_RPC);
    const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

    // Create an instance of the FlashLoanArbitrage contract.
    const flashLoanContract = new ethers.Contract(flashLoanAddress, flashLoanABI, signer);

    // Define the asset and the flash loan amount. Example uses USDC on Polygon.
    const asset = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
    const amount = ethers.utils.parseUnits("1000", 6);

    // Initiate the flash loan.
    const tx = await flashLoanContract.initiateFlashLoan(asset, amount);
    const receipt = await tx.wait();

    res.json({ message: "Flash loan executed successfully", receipt });
  } catch (error) {
    console.error("Error executing flash loan:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
