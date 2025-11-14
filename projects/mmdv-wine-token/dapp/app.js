// app.js – MWT5 Dapp educativa (lectura + conexión opcional)

// 1) Configuración básica
const CONTRACT_ADDRESS = "0x8e913dEadC1F9c25a2ADc7BAD793cEf72CD02dC2";
const NETWORK_NAME = "sepolia";

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
    "inputs": [
      { "internalType": "address", "name": "spender", "type": "address" },
      { "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "approve",
    "outputs": [
      { "internalType": "bool", "name": "", "type": "bool" }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "owner", "type": "address" },
      { "internalType": "address", "name": "spender", "type": "address" }
    ],
    "name": "allowance",
    "outputs": [
      { "internalType": "uint256", "name": "", "type": "uint256" }
    ],
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

  // Funciones educativas (transacción)
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
let readProvider;
let readContract;
let writeProvider;
let writeContract;
let signer;
let currentAccount = null;
let contractOwner = null;

// 3) Utilidades
function formatUnits(bn) {
  if (!bn) return "0";
  try {
    return bn.toString();
  } catch {
    return String(bn);
  }
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
  try {
    // proveedor público de Sepolia
    readProvider = ethers.getDefaultProvider(NETWORK_NAME);
    readContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, readProvider);

    contractOwner = await readContract.owner();
    await loadGlobalStats();
  } catch (err) {
    console.error("Error en initReadOnly:", err);
  }
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
    alert("Necesitas Metamask u otra wallet con inyección de 'window.ethereum'.");
    return;
  }

  try {
    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    });

    currentAccount = accounts[0];

    writeProvider = new ethers.providers.Web3Provider(window.ethereum);
    signer = writeProvider.getSigner();
    writeContract = new ethers.Contract(
      CONTRACT_ADDRESS,
      CONTRACT_ABI,
      signer
    );

    // Actualizamos etiqueta "Cuenta conectada"
    const addrLabel = document.getElementById("connectedAddress");
    if (addrLabel) {
      addrLabel.textContent = currentAccount;
    }

    // Opcional: cambiar texto del botón
    const btn = document.getElementById("connectWalletBtn");
    if (btn) {
      btn.textContent = `Conectado: ${currentAccount.slice(
        0,
        6
      )}...${currentAccount.slice(-4)}`;
      btn.classList.add("connected");
    }

    // Cargamos panel del holder con la cuenta conectada
    await loadHolderView(currentAccount);
  } catch (err) {
    console.error("Error al conectar wallet:", err);
    alert("No se pudo conectar la wallet o se canceló la conexión.");
  }
}

// 7.1) Desconectar Wallet
async function disconnectWallet() {
  console.log("⛔ Desconectando wallet…");

  // Limpiar estado interno JS
  currentAccount = null;
  signer = null;
  writeProvider = null;
  writeContract = null;

  // Restaurar UI del botón "Conectar"
  const connectBtn = document.getElementById("connectWalletBtn");
  if (connectBtn) {
    connectBtn.textContent = "Conectar wallet";
    connectBtn.classList.remove("connected");
    connectBtn.disabled = false;
  }

  // Restablecer texto de cuenta conectada
  const addrLabel = document.getElementById("connectedAddress");
  if (addrLabel) addrLabel.textContent = "No conectada";

  // Limpiar panel del holder
  const ids = [
    "holderAddress",
    "holderBalance",
    "holderTrackedAmount",
    "holderFirstPurchase",
    "holderPriority",
    "holderMultiplier",
    "holderLoyaltyBonus",
    "holderMinResale",
  ];

  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = "–";
  });

  // Estado de transacción
  const tx = document.getElementById("txStatus");
  if (tx) tx.textContent = "Sin transacciones aún.";
}

// 8) Cancelación 24h
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
    const status = document.getElementById("txStatus");
    status.textContent = `⏳ Enviando transacción... ${tx.hash}`;
    const receipt = await tx.wait();
    status.textContent = `✅ Cancelación ejecutada en el bloque ${receipt.blockNumber}.`;
    await loadHolderView(currentAccount);
  } catch (err) {
    console.error(err);
    document.getElementById("txStatus").textContent =
      `❌ Error en la transacción: ${err.reason || err.message}`;
  }
}


// 9) Buyback del owner
async function ownerBuybackFromUI() {
  if (!writeContract || !currentAccount) {
    alert("Conecta tu wallet primero.");
    return;
  }
  if (!contractOwner || currentAccount.toLowerCase() !== contractOwner.toLowerCase()) {
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
    const status = document.getElementById("txStatus");
    status.textContent = `⏳ Enviando buyback... ${tx.hash}`;
    const receipt = await tx.wait();
    status.textContent = `✅ Buyback ejecutado en el bloque ${receipt.blockNumber}.`;
  } catch (err) {
    console.error(err);
    document.getElementById("txStatus").textContent =
      `❌ Error en el buyback: ${err.reason || err.message}`;
  }
}

// 9.1) Aprobar permiso (vendedor)
async function approveAllowanceFromUI() {
  if (!writeContract || !currentAccount) {
    alert("Conecta tu wallet primero (la del vendedor).");
    return;
  }

  if (!contractOwner) {
    alert("No se ha podido leer la dirección del owner.");
    return;
  }

  const amountStr = document.getElementById("approveAmountInput").value;
  const amount = amountStr ? BigInt(amountStr) : 0n;

  if (amount === 0n) {
    alert("Indica una cantidad > 0 para autorizar.");
    return;
  }

  try {
    const status = document.getElementById("txStatus");
    status.textContent = "⏳ Enviando approve...";

    const tx = await writeContract.approve(contractOwner, amount);
    status.textContent = `⏳ Tx enviada: ${tx.hash}`;
    const receipt = await tx.wait();

    status.textContent =
      `✅ Permiso aprobado para ${contractOwner} por ${amount} tokens (bloque ${receipt.blockNumber}).`;
  } catch (err) {
    console.error("Error en approve:", err);
    const status = document.getElementById("txStatus");
    status.textContent =
      `❌ Error en approve: ${err.reason || err.message}`;
  }
}



// 10) Wiring DOM
window.addEventListener("DOMContentLoaded", async () => {
  // 1. Cargar datos globales en modo sólo lectura
  await initReadOnly();

   // 👉 Rellenar automáticamente la dirección del owner en la tarjeta de aprobación
  const approveOwnerAddr = document.getElementById("approveOwnerAddress");
  if (approveOwnerAddr && contractOwner) {
    approveOwnerAddr.textContent = contractOwner;
  }
  
  // 2. Botón "Conectar wallet"
  const connectBtn = document.getElementById("connectWalletBtn");
  if (connectBtn) {
    connectBtn.addEventListener("click", connectWallet);
  }

  // 3. Botón "Ver datos del holder"
  const refreshBtn = document.getElementById("refreshHolderButton");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", async () => {
      const addrInput =
        document.getElementById("manualAddressInput").value.trim();
      const addr = addrInput || currentAccount;
      if (!addr) return;
      await loadHolderView(addr);
    });
  }

  // 4. Botón "Validar precio"
  const validateBtn = document.getElementById("validatePriceButton");
  if (validateBtn) {
    validateBtn.addEventListener("click", validatePriceFromUI);
  }

  // 5. Botón "Cancelar 24h"
  const cancelBtn = document.getElementById("cancelButton");
  if (cancelBtn) {
    cancelBtn.addEventListener("click", cancelWithin24hFromUI);
  }

  // 6. Botón "Buyback (owner)"
  const buybackBtn = document.getElementById("buybackButton");
  if (buybackBtn) {
    buybackBtn.addEventListener("click", ownerBuybackFromUI);
  }

  // 7. Botón "Desconectar wallet"
  const disconnectBtn = document.getElementById("disconnectWalletBtn");
  if (disconnectBtn) {
    disconnectBtn.addEventListener("click", disconnectWallet);
  }

  // 8. Botón "Aprobar permiso"
  const approveBtn = document.getElementById("approveButton");
  if (approveBtn) {
    approveBtn.addEventListener("click", approveAllowanceFromUI);
  }
});
