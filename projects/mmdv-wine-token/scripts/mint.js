const hre = require("hardhat");

async function main() {
  const tokenAddress = process.env.TOKEN_ADDRESS; // 0x81f4bA822482b61F46BFBc724B112E1aBEBCaE87
  const toRaw        = process.env.MINT_TO;       // 0xC9d05cdBfE0b2611A0b70364DF6c43d2612a9197 (tu cuenta)
  const amountRaw    = process.env.MINT_AMOUNT || "1000"; // unidades humanas

  const to      = hre.ethers.getAddress(toRaw);      // ✔ normaliza checksum
  const amount  = hre.ethers.parseUnits(amountRaw, 18); // ✔ 18 decimales
  const token   = await hre.ethers.getContractAt("MMDVWineToken", tokenAddress);

  console.log(`Minteando a: ${to}`);
  const tx = await token.mint(to, amount);
  await tx.wait();
  console.log(`✅ Mint OK: ${amountRaw} MWT`);
}

main().catch((e) => { console.error("❌ Error:", e.message); process.exit(1); });
