const hre = require("hardhat");

async function main() {
  const token = await hre.ethers.getContractAt(
    "MMDVWineToken",
    process.env.TOKEN_ADDRESS // dirección del contrato verificado en Sepolia
  );

  const balance = await token.balanceOf(process.env.MINT_TO); // tu wallet
  console.log("💰 Balance MWT:", hre.ethers.formatUnits(balance, 18));
}

main();
