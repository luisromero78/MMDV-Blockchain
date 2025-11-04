const hre = require("hardhat");

async function main() {
  const names = (process.env.CANDIDATES || "Alice,Bob,Charlie")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);
  const Voting = await hre.ethers.getContractFactory("Voting");
  const voting = await Voting.deploy(names);
  await voting.waitForDeployment();                 // <-- v6

  console.log("Voting deployed to:", voting.target); // <-- v6

  // Guardar ABI para /docs
  const fs = require("fs");
  const path = require("path");
  const artifact = await hre.artifacts.readArtifact("Voting");
  const outDir = path.join(__dirname, "..", "docs", "abi");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "Voting.json"), JSON.stringify(artifact, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
