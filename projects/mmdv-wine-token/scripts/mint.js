const hre = require("hardhat");

const CONTRACT = "0x81f4ba822482b61f46bfbc724b112e1abebcae87"; // contrato en Sepolia

async function main() {
  const [owner] = await hre.ethers.getSigners();        // tu cuenta conectada
  const to = owner.address;                              // mint al owner
  const token = await hre.ethers.getContractAt("MMDVWineToken", CONTRACT, owner);

  const amount = hre.ethers.parseUnits("1000", 18);      // 1.000 MWT
  console.log("Minteando a:", to);

  const tx = await token.mint(to, amount);               // ⚠️ Asegúrate de ser owner
  await tx.wait();

  console.log("✅ Mint OK:", hre.ethers.formatUnits(amount, 18), "MWT");
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
