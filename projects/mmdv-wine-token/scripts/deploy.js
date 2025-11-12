cconst hre = require("hardhat");

async function main() {
  // Cap total del lote (ej.: 1.000.000 tokens con 18 decimales)
  const CAP = hre.ethers.parseUnits("1000000", 18);

  const Token = await hre.ethers.getContractFactory("MMDVWineToken");
  const token = await Token.deploy(CAP);
  const tx = await token.deploymentTransaction();
  await token.waitForDeployment();

  const address = await token.getAddress();
  console.log("\n✅ Token desplegado en:", address);
  console.log("🔗 Tx hash:", tx?.hash);

  // (Opcional) verificación en Etherscan si tienes ETHERSCAN_API_KEY en .env
  await new Promise(r => setTimeout(r, 30_000));
  try {
    await hre.run("verify:verify", {
      address,
      constructorArguments: [CAP],
    });
    console.log("🔎 Verificado en Etherscan");
  } catch (err) {
    console.log("ℹ️ Verificación omitida o ya verificado:", err.message || err);
  }
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
