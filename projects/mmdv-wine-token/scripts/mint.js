const hre = require("hardhat");

// Dirección exacta del contrato en Sepolia (checksum correcta)
const CONTRACT = "0x81f4Ba822482b61F46BFbC724B112E1aBEbCAE87";

const ABI = [
  "function mint(address to, uint256 amount) external",
  "function owner() view returns (address)",
  "function balanceOf(address) view returns (uint256)"
];

async function main() {
  const [signer] = await hre.ethers.getSigners();
  const signerAddress = await signer.getAddress();

  console.log("Signer:", signerAddress);

  const contractAddress = hre.ethers.getAddress(CONTRACT);
  const token = new hre.ethers.Contract(contractAddress, ABI, signer);

  const to = hre.ethers.getAddress(signerAddress);
  const amount = hre.ethers.parseUnits("1000", 18);

  console.log(`Minteando 1000 MWT a ${to}...`);

  const tx = await token.mint(to, amount, { gasLimit: 120000 });
  console.log("Tx enviada:", tx.hash);

  const receipt = await tx.wait();
  console.log("✅ Tx confirmada en bloque:", receipt.blockNumber);

  const balance = await token.balanceOf(to);
  console.log("📦 Balance actual:", hre.ethers.formatUnits(balance, 18), "MWT");
}

main().catch((err) => {
  console.error("❌ Error:", err.shortMessage || err.message || err);
  process.exit(1);
});
