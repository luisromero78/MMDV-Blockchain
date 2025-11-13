const hre = require("hardhat");

async function main() {
  const [owner] = await hre.ethers.getSigners();

  // Dirección del contrato desplegado (MMDVWineTokenV2)
  const CONTRACT_ADDRESS = "0x15E054F9cB597b80CB077b69F23C3802C2516700";

  // Instancia del contrato
  const token = await hre.ethers.getContractAt("MMDVWineTokenV2", CONTRACT_ADDRESS);

  // Minteamos 500.000 tokens (18 decimales)
  const amount = hre.ethers.parseUnits("500000", 18);

  console.log("Owner:", owner.address);
  console.log("Minting 500000 MWT2...");

  // 👇 ESTA ES LA FUNCIÓN CORRECTA
  const tx = await token.educationalMint(owner.address, amount);

  console.log("⏳ Esperando confirmación...");
  await tx.wait();

  console.log("✅ Mint completado.");
  console.log("🔗 Tx hash:", tx.hash);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
