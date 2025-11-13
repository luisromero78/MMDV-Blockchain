const hre = require("hardhat");

async function main() {
  const [owner] = await hre.ethers.getSigners();

  // ⚠️ Dirección del contrato V2 recién desplegado
  const CONTRACT_ADDRESS = "0x15E054F9cB597b80CB077b69F23C3802C2516700";

  // Instancia del contrato
  const token = await hre.ethers.getContractAt("MMDVWineTokenV2", CONTRACT_ADDRESS);

  // 500.000 tokens con 18 decimales
  const amount = hre.ethers.parseUnits("500000", 18);

  console.log("Owner:", owner.address);
  console.log("Minting:", "500000 MWT2");

  // 👇 Usa aquí el nombre de la función de minteo que tengas en el contrato
  // Si la función pública se llama distinto, cambia "mint" por el nombre real
  const tx = await token.mint(owner.address, amount);
  await tx.wait();

  console.log("✅ Mint completado.");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
