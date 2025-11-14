// app.js – MWT5 Dapp educativa (lectura + conexión opcional)

// 1) Configuración básica
const CONTRACT_ADDRESS = "0x8e913dEadC1F9c25a2ADc7BAD793cEf72CD02dC2";

const CONTRACT_ABI = [
  // Metadatos básicos
  {
    "inputs": [],
    "name": "name",
    "outputs": [{ "internalType": "string", "name": "", "type": "string" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "symbol",
    "outputs": [{ "internalType": "string", "name": "", "type": "string" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "decimals",
    "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }],
    "stateMutability": "pure",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },

  // Parámetros educativos
  {
    "inputs": [],
    "name": "MAX_SUPPLY",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "BASE_PRICE_UNITS",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "CANCELLATION_PERIOD",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "MIN_LOCK_PERIOD",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "BUYBACK_PRICE_UNITS",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },

  // Estado por holder
  {
    "inputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "name": "holdings",
    "outputs": [
      { "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "internalType": "uint64", "name": "firstPurchaseAt", "type": "uint64" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "name": "hasPriorityForNextLot",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "view",
    "type": "function"
  },

  // Analíticas educativas
  {
    "inputs": [{ "internalType": "address", "name": "holder", "type": "address" }],
    "name": "currentValueMultiplier",
    "outputs": [{ "internalType": "uint256", "name": "multiplierBps", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "holder", "type": "address" }],
    "name": "loyaltyBonusAmount",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "holder", "type": "address" }],
    "name": "minResalePriceUnitsPerToken",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "holder", "type": "address" },
      { "internalType": "uint256", "name": "proposedPriceUnitsPerToken", "type": "uint256" }
    ],
    "name": "validateResalePrice",
    "outputs": [
      { "internalType": "bool", "name": "ok", "type": "bool" },
      { "internalType": "uint256", "name": "minPriceUnitsPerToken", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },

  // Cosas estándar
  {
    "inputs": [{ "internalType": "address", "name": "account", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },

  // Funciones educativas que implican transacción (las dejamos preparadas)
  {
    "inputs": [{ "internalType": "uint256", "name": "amount", "type": "uint256" }],
    "name": "cancelWithin24h",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "seller", "type": "address" },
      { "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "ownerBuyback",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

// 2) Estado global JS
let readProvider;      // proveedor solo lectura (no necesita MetaMask)
let readContract;
let writeProvider;     // proveedor con Metamask
let signer;
let writeContract;
let currentAccount = null;
let contractOwner = null;

// 3) Utilidades
function formatUnits(bn) {
  return bn ? bn.toString() : "0";
}

function formatDate(ts) {
  if (!ts || ts === 0n) return "Sin compra registrada";
  const ms = Number(ts) * 1000;
  return new Date(ms).toLocaleString();
}

function bpsToPercent(bps) {
  return (Number(bps) / 100).toFixed(2) + " %";
}

// 4) Carga inicial (solo lectura)
async function initReadOnly() {
  // Proveedor público de Sepolia (lector). Ethers se encarga del endpoint.
  readProvider = ethers.getDefaultProvider("sepolia");
  readContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, readProvider);

  contractOwner = await readContract.owner();
  await loadGlobalStats();
}

async function loadGlobalStats() {
  const [
    name,
    symbol,
    totalSupply,
    maxSupply,
    basePrice,
    cancelPeriod,
    lockPeriod,
    buybackPrice
  ] = await Promise.all([
    readContract.name(),
    readContract.symbol(),
    readContract.totalSupply(),
    readContract.MAX_SUPPLY(),
    readContract.BASE_PRICE_UNITS(),
    readContract.CANCELLATION_PERIOD(),
    readContract.MIN_LOCK_PERIOD(),
    readContract.BUYBACK_PRICE_UNITS()
  ]);

  // Rellena tarjetas globales
  document.getElementById("tokenName").textContent = `${name} (${symbol})`;
  document.getElementById("supplyInfo").textContent =
    `${formatUnits(totalSupply)} / ${formatUnits(maxSupply)} MWT5`;
  document.getElementById("basePrice").textContent =
    `${formatUnits(basePrice)} unidades simbólicas`;
  document.getElementById("cancelPeriod").textContent =
    `${Number(cancelPeriod) / 3600} horas`;
  document.getElementById("lockPeriod").textContent =
    `${(Number(lockPeriod) / (3600 * 24 * 365)).toFixed(1)} años`;
  document.getElementById("buybackPrice").textContent =
    `${formatUnits(buybackPrice)} unidades por token`;

  document.getElementById("ownerAddress").textContent = contractOwner;
}

// 5) Cargar datos de un holder (lectura)
async function loadHolderView(address) {
  if (!address) return;

  const [
    balance,
    holding,
    hasPriority,
    multiplierBps,
    loyaltyBonus,
    minResalePrice
  ] = await Promise.all([
    readContract.balanceOf(address),
    readContract.holdings(address),
    readContract.hasPriorityForNextLot(address),
    readContract.currentValueMultiplier(address),
    readContract.loyaltyBonusAmount(address),
    readContract.minResalePriceUnitsPerToken(address)
  ]);

  const firstPurchaseAt = holding.firstPurchaseAt;

  document.getElementById("holderAddress").textContent = address;
  document.getElementById("holderBalance").textContent = formatUnits(balance);
  document.getElementById("holderTrackedAmount").textContent = formatUnits(holding.amount);
  document.getElementById("holderFirstPurchase").textContent = formatDate(firstPurchaseAt);
  document.getElementById("holderPriority").textContent = hasPriority ? "Sí" : "No";
  document.getElementById("holderMultiplier").textContent = bpsToPercent(multiplierBps);
  document.getElementById("holderLoyaltyBonus").textContent = formatUnits(loyaltyBonus);
  document.getElementById("holderMinResale").textContent =
    `${formatUnits(minResalePrice)} unidades / token`;
}

// 6) Validar un precio propuesto (solo lectura)
async function validatePriceFromUI() {
  const input = document.getElementById("proposedPriceInput");
  const output = document.getElementById("proposedPriceResult");

  if (!currentAccount) {
    output.textContent = "Conecta tu wallet para validar tu precio mínimo.";
    return;
  }

  const proposed = BigInt(input.value || "0");
  if (proposed === 0n) {
    output.textContent = "Introduce un precio simbólico > 0.";
    return;
  }

  const [ok, minPrice] = await readContract.validateResalePrice(
    currentAccount,
    proposed
  );

  if (ok) {
    output.textContent =
      `✅ El precio respeta el mínimo educativo (${formatUnits(minPrice)} unidades/token).`;
  } else {
    output.textContent =
      `⚠️ Precio demasiado bajo. Mínimo educativo: ${formatUnits(minPrice)} unidades/token.`;
  }
}

// 7) Conexión con MetaMask
async function connectWallet() {
  if (!window.ethereum) {
    alert("Necesitas MetaMask (u otra wallet) para conectar.");
    return;
  }

  writeProvider = new ethers.BrowserProvider(window.ethereum);
  const accounts = await writeProvider.send("eth_requestAccounts", []);
  currentAccount = accounts[0];

  signer = await writeProvider.getSigner();
  writeContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

  document.getElementById("connectedAddress").textContent = currentAccount;
  document.getElementById("connectButton").classList.add("connected");

  // Carga datos del holder conectado
  await loadHolderView(currentAccount);
}

// 8) Función educativa: cancelWithin24h
async function cancelWithin24hFromUI() {
  if (!writeContract || !currentAccount) {
    alert("Conecta tu wallet primero.");
    return;
  }

  const input = document.getElementById("cancelAmountInput");
  const amount = input.value ? BigInt(input.value) : 0n;
  if (amount === 0n) {
    alert("Introduce una cantidad > 0.");
    return;
  }

  try {
    const tx = await writeContract.cancelWithin24h(amount);
    document.getElementById("txStatus").textContent =
      `⏳ Enviando transacción... ${tx.hash}`;
    const receipt = await tx.wait();
    document.getElementById("txStatus").textContent =
      `✅ Cancelación ejecutada en el bloque ${receipt.blockNumber}.`;

    // Refresca datos del holder
    await loadHolderView(currentAccount);
  } catch (err) {
    console.error(err);
    document.getElementById("txStatus").textContent =
      `❌ Error en la transacción: ${err.reason || err.message}`;
  }
}

// 9) (Opcional) Buyback para el owner – solo si currentAccount == contractOwner
async function ownerBuybackFromUI() {
  if (!writeContract || !currentAccount) {
    alert("Conecta tu wallet primero.");
    return;
  }

  if (currentAccount.toLowerCase() !== contractOwner.toLowerCase()) {
    alert("Solo el owner del contrato puede usar el buyback.");
    return;
  }

  const seller = document.getElementById("buybackSellerInput").value.trim();
  const amountStr = document.getElementById("buybackAmountInput").value;
  const amount = amountStr ? BigInt(amountStr) : 0n;

  if (!seller || amount === 0n) {
    alert("Indica dirección del vendedor y cantidad.");
    return;
  }

  try {
    const tx = await writeContract.ownerBuyback(seller, amount);
    document.getElementById("txStatus").textContent =
      `⏳ Enviando buyback... ${tx.hash}`;
    const receipt = await tx.wait();
    document.getElementById("txStatus").textContent =
      `✅ Buyback ejecutado en el bloque ${receipt.blockNumber}.`;
  } catch (err) {
    console.error(err);
    document.getElementById("txStatus").textContent =
      `❌ Error en el buyback: ${err.reason || err.message}`;
  }
}

// 10) Exponer funciones al DOM
window.addEventListener("DOMContentLoaded", async () => {
  await initReadOnly();

  // Botones
  document.getElementById("connectButton").onclick = connectWallet;
  document.getElementById("refreshHolderButton").onclick = async () => {
    const addrInput = document.getElementById("manualAddressInput").value.trim();
    const addr = addrInput || currentAccount;
    if (!addr) return;
    await loadHolderView(addr);
  };
  document.getElementById("validatePriceButton").onclick = validatePriceFromUI;
  document.getElementById("cancelButton").onclick = cancelWithin24hFromUI;
  document.getElementById("buybackButton").onclick = ownerBuybackFromUI;
});
