const hre = require("hardhat");

const CONTRACT = "PON_AQUI_LA_DIRECCION_DEL_CONTRATO";

async function main() {
  const token = await hre.ethers.getContractAt("MMDVWineToken", CONTRACT);

  const [name, symbol, decimals, totalSupply] = await Promise.all([
    token.name(),
    token.symbol(),
    token.decimals(),
    token.totalSupply()
  ]);

  console.log({ name, symbol, decimals, totalSupply: totalSupply.toString() });
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
