const hre = require("hardhat");

const CONTRACT = "0x81f4Ba822482b61F46BFbC724B112E1aBEbCAE87";
const ABI = [
  "function mint(address to, uint256 amount) external",
  "function balanceOf(address) view returns (uint256)"
];

async function main() {
  const [signer] = await hre.ethers.getSigners();
  console.log("Signer:", signer.address);

  const token = new hre.ethers.Contract(CONTRACT, ABI, signer);

  const to = signer.address;                   // minteamos al owner (tu cuenta)
  const amount = hre.ethers.parseUnits("1000", 18);  // 1.000 MWT

  console.log("Minteando a:", to);
  const tx = await token.mint(to, amount, { gasLimit: 120000 });
  console.log("⛏️  Tx:", tx.hash);
  await tx.wait();

  const bal = await token.balanceOf(to);
  console.log("📦 Balance MWT:", hre.ethers.formatUnits(bal, 18));
}

main().catch(err => {
  console.error("❌ Error:", err.shortMessage || err.message || err);
  process.exit(1);
});
