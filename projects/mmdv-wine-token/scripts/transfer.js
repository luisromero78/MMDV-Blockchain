const hre = require("hardhat");
const { ethers } = hre;

async function main() {
  const token = await ethers.getContractAt("MMDVWineToken", process.env.TOKEN_ADDRESS);
  const to = "0x..."; // otra cuenta de prueba
  const amount = ethers.parseUnits("100", 18);
  const tx = await token.transfer(to, amount);
  await tx.wait();
  console.log("✅ Transferidos 100 MWT a", to);
}

main();
