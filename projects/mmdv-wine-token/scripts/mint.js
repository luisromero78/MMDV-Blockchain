const hre = require("hardhat");
const CONTRACT = "0x81f4ba822482b61f46bfbc724b112e1abebcae87";

async function main() {
  const [signer] = await hre.ethers.getSigners();
  console.log("Signer:", signer.address);

  const token = await hre.ethers.getContractAt("MMDVWineToken", CONTRACT, signer);
  const owner = await token.owner();
  console.log("Owner del contrato:", owner);

  const to = signer.address;
  const amount = hre.ethers.parseUnits("1000", 18);

  console.log("Minteando a:", to, "monto:", hre.ethers.formatUnits(amount, 18), "MWT");
  const tx = await token.mint(to, amount, { gasLimit: 120000 });
  console.log("⛏️  Tx enviada:", tx.hash);

  const receipt = await tx.wait();
  console.log("✅ Tx minada en bloque:", receipt.blockNumber, "status:", receipt.status);

  const bal = await token.balanceOf(to);
  console.log("📦 Balance MWT ahora:", hre.ethers.formatUnits(bal, 18));
}

main().catch((e) => { console.error("❌ Error:", e.shortMessage || e.message || e); process.exitCode = 1; });
