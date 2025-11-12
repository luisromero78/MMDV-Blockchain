const hre = require("hardhat");

// 🧱 Sustituye esta por la dirección del contrato desplegado
const CONTRACT = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

async function main() {
  const [owner] = await hre.ethers.getSigners();
  const token = await hre.ethers.getContractAt("MMDVWineToken", CONTRACT);

  // Mint 1.000 tokens al owner (tú mismo)
  const amount = hre.ethers.parseUnits("1000", 18);
  const tx = await token.mint(owner.address, amount);
  await tx.wait();

  console.log(`✅ Se han minteado 1.000 MWT para ${owner.address}`);
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
