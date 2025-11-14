const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  const Token = await hre.ethers.getContractFactory("MMDVWineTokenV3");
  const token = await Token.deploy(); // sin argumentos
  const tx = await token.deploymentTransaction();
  await token.waitForDeployment();

  const address = await token.getAddress();
  console.log("\n✅ MMDVWineTokenV3 desplegado en:", address);
  console.log("🔗 Tx hash:", tx.hash);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
