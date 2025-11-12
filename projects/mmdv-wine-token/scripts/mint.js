const hre = require("hardhat");

// Dirección del contrato en Sepolia:
const CONTRACT = "0x81f4bA822482B61F46BFBC724B112e1ABEBcAE87";

// Pon aquí tu address de MetaMask o añádelo al .env como MY_ADDRESS
const TO = process.env.MY_ADDRESS || "0xTU_DIRECCION_METAMASK";

async function main() {
  const token = await hre.ethers.getContractAt("MMDVWineToken", CONTRACT);
  const amount = hre.ethers.parseUnits("1000", 18);
  const tx = await token.mint(TO, amount);
  await tx.wait();
  console.log(`✅ Mint OK: 1000 MWT a ${TO}`);
}

main().catch(e => { console.error(e); process.exitCode = 1; });
