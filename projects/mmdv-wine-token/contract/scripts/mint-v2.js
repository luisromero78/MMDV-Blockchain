// scripts/mint-v2.js
const { ethers } = require("hardhat");

async function main() {
  const [owner] = await ethers.getSigners();
  console.log("Owner:", owner.address);

  const contractAddress = "0x15E054F9cB597b80CB077b69f23C3802C2516700";

  const Token = await ethers.getContractFactory("MMDVWineTokenV2");
  const token = await Token.attach(contractAddress);

  // 500.000 MWT2 con 18 decimales
  const amount = ethers.parseUnits("500000", 18);

  console.log("Minting 500000 MWT2...");
  const tx = await token.educationalMint(owner.address, amount);
  await tx.wait();

  console.log("✅ Mint OK");
  const supply = await token.totalSupply();
  console.log("Total supply:", supply.toString());
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
