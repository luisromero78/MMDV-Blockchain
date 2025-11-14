const hre = require("hardhat");

async function main() {
  // Cuenta que despliega = owner del contrato (msg.sender en el constructor)
  const [deployer] = await hre.ethers.getSigners();
  console.log("👤 Deploying with account:", deployer.address);

  const Token = await hre.ethers.getContractFactory("MMDVWineTokenV3");

  // 👉 V3 NO recibe cap en el constructor
  const token = await Token.deploy();

  const tx = await token.deploymentTransaction();
  await token.waitForDeployment();

  const address = await token.getAddress();
  console.log("\n✅ MMDVWineTokenV3 desplegado en:", address);
  console.log("🔗 Tx hash:", tx?.hash);

  // (Opcional) verificación en Etherscan si tienes ETHERSCAN_API_KEY en .env
  await new Promise((r) => setTimeout(r, 30_000));
  try {
    await hre.run("verify:verify", {
      address,
      constructorArguments: [], // 👈 ahora va vacío
    });
    console.log("🔎 Verificado en Etherscan");
  } catch (err) {
    console.log("ℹ️ Verificación omitida o ya verificado:", err.message || err);
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
