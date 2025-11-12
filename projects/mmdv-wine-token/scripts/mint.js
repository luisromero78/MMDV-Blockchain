const hre = require("hardhat");

// Copia EXACTA del contrato verificado en Sepolia
const CONTRACT = "0x81f4Ba822482b61F46BFbC724B112E1aBEbCAE87";

const ABI = [
  "function mint(address to, uint256 amount) external",
  "function owner() view returns (address)",
  "function balanceOf(address) view returns (uint256)"
];

function normalize(addr) {
  // quita espacios y aplica checksum; si hay un caracter raro, lanzará error claro
  return hre.ethers.getAddress(String(addr).trim());
}

async function main() {
  const [signer] = await hre.ethers.getSigners();

  // Si tienes la address en .env úsala, si no, usa la del signer
  const toRaw = process.env.ACCOUNT_ADDRESS || await signer.getAddress();

  const to = normalize(toRaw);
  const contractAddr = normalize(CONTRACT);

  console.log("Signer:", await signer.getAddress());
  console.log("Minteando a:", to);

  const token = new hre.ethers.Contract(contractAddr, ABI, signer);

  // sanity checks
  const owner = await token.owner();
  console.log("Owner del contrato:", owner);

  const amount = hre.ethers.parseUnits("1000", 18); // 1.000 MWT
  const tx = await token.mint(to, amount, { gasLimit: 120000 });
  console.log("⛏️  Tx enviada:", tx.hash);

  const r = await tx.wait();
  console.log("✅ Tx minada. Bloque:", r.blockNumber, "status:", r.status);

  const bal = await token.balanceOf(to);
  console.log("📦 Balance MWT destino:", hre.ethers.formatUnits(bal, 18));
}

main().catch(e => {
  console.error("❌ Error:", e.shortMessage || e.message || e);
  process.exit(1);
});
