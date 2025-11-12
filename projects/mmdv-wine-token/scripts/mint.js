const hre = require("hardhat");

// Dirección del contrato en Sepolia (en minúsculas)
const CONTRACT = "0x81f4ba822482b61f46bfbc724b112e1abebcae87";

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  // Conecta el contrato con el signer que firmará la tx
  const token = await hre.ethers.getContractAt("MMDVWineToken", CONTRACT, deployer);

  // Minteamos a tu propia cuenta (válida seguro)
  const to = deployer.address;
  const amount = hre.ethers.parseUnits("1000", 18);

  console.log("Minteando a:", to);
  const tx = await token.mint(to, amount);
  await tx.wait();
  console.log("✅ Mint OK: 1000 MWT");
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
