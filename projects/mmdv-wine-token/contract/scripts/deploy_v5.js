const { ethers } = require("hardhat");

async function main() {
  const MMDVWineTokenV5 = await ethers.getContractFactory("MMDVWineTokenV5");
  const token = await MMDVWineTokenV5.deploy();

  await token.waitForDeployment();

  const address = await token.getAddress();
  console.log("MMDVWineTokenV5 deployed to:", address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
