const hre = require("hardhat");

async function main() {
  // 👇 Ajusta estos valores a tu lote:
  const NAME = "MMDV Wine Token";
  const SYMBOL = "MMDVW";
  const INITIAL_SUPPLY = hre.ethers.parseUnits("10000", 18); // 10.000 tokens

  // 👇 El nombre debe coincidir EXACTO con el contrato en tu .sol
  const Token = await hre.ethers.getContractFactory("MMDVWineToken");
  const token = await Token.deploy(NAME, SYMBOL, INITIAL_SUPPLY);
  const tx = await token.deploymentTransaction();
  await token.waitForDeployment();

  const address = await token.getAddress();
  console.log("\n✅ Token desplegado en:", address);
  console.log("🔗 Tx hash:", tx.hash);

  // (opcional) verificación en Etherscan si tienes ETHERSCAN_API_KEY en .env
  // pequeño delay para que indexe
  await new Promise(r => setTimeout(r, 30_000));
  try {
    await hre.run("verify:verify", {
      address,
      constructorArguments: [NAME, SYMBOL, INITIAL_SUPPLY],
    });
    console.log("🔎 Verificado en Etherscan");
  } catch (err) {
    console.log("ℹ️ Verificación omitida o ya verificado:", err.message || err);
  }
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
