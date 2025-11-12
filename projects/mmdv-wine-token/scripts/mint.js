// scripts/mint.js
const hre = require("hardhat");

const CONTRACT = "0x81f4bA822482B61F46BFBC724B112e1ABEBcAE87"; // tu contrato en Sepolia

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const token = await hre.ethers.getContractAt("MMDVWineToken", CONTRACT, deployer);

  const to = deployer.address;                           // 👈 destinatario válido
  const amount = hre.ethers.parseUnits("1000", 18);      // 1.000 MWT

  console.log("Minteando a:", to);
  const tx = await token.mint(to, amount);
  await tx.wait();
  console.log("✅ Mint OK: 1000 MWT");
}

main().catch(e => { console.error(e); process.exitCode = 1; });
