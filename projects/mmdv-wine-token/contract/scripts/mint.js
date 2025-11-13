const hre = require("hardhat");
const { ethers } = hre;

async function main() {
  const tokenAddress = ethers.getAddress(process.env.TOKEN_ADDRESS);
  const to = ethers.getAddress(process.env.MINT_TO);
  const amount = BigInt(process.env.MINT_AMOUNT) * (10n ** 18n); // 18 decimales

  console.log("Minteando a:", to);

  const token = await ethers.getContractAt("MMDVWineToken", tokenAddress);
  const tx = await token.mint(to, amount);
  await tx.wait();
  console.log("✅ Mint OK");
}

main().catch((e) => {
  console.error("❌ Error:", e.message);
  process.exit(1);
});
