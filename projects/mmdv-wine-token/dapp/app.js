// Dirección del contrato MWT5 en Sepolia
const CONTRACT_ADDRESS = "0x8e913dEadCF19c25a2ADc7BAD793cEf72C0D2dC2";

// RPC público de solo lectura (sin necesidad de Metamask)
const READONLY_RPC = "https://sepolia.drpc.org";

// ABI mínima: solo las funciones que vamos a usar al principio.
// Si quieres, más adelante pegamos aquí el ABI completo desde Etherscan.
const CONTRACT_ABI = [
  // name()
  {
    "inputs": [],
    "name": "name",
    "outputs": [{ "internalType": "string", "name": "", "type": "string" }],
    "stateMutability": "view",
    "type": "function"
  },
  // symbol()
  {
    "inputs": [],
    "name": "symbol",
    "outputs": [{ "internalType": "string", "name": "", "type": "string" }],
    "stateMutability": "view",
    "type": "function"
  },
  // decimals()
  {
    "inputs": [],
    "name": "decimals",
    "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  // totalSupply()
  {
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  // cap() (de ERC20Capped)
  {
    "inputs": [],
    "name": "cap",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  // balanceOf(address)
  {
    "inputs": [{ "internalType": "address", "name": "account", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  // currentValueMultiplier(address)
  {
    "inputs": [{ "internalType": "address", "name": "holder", "type": "address" }],
    "name": "currentValueMultiplier",
    "outputs": [{ "internalType": "uint256", "name": "multiplierBps", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  // loyaltyBonusAmount(address)
  {
    "inputs": [{ "internalType": "address", "name": "holder", "type": "address" }],
    "name": "loyaltyBonusAmount",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  // transfer(address,uint256)
  {
    "inputs": [
      { "internalType": "address", "name": "to", "type": "address" },
      { "internalType": "uint256", "name": "value", "type": "uint256" }
    ],
    "name": "transfer",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  // owner()
  {
    "inputs": [],
    "name": "owner",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  }
  // Más adelante podemos añadir aquí las funciones específicas
  // de recompra, cancelación, etc. cuando cerremos nombres exactos.
];

// ---------- INSTANCIAS WEB3 ----------

// Lectura sin wallet
const web3Read = new Web3(new Web3.providers.HttpProvider(READONLY_RPC));
const contractRead = new web3Read.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS);

// Escritura con wallet (se inicializará al conectar)
let web3Write = null;
let contractWrite = null;
let currentAccount = null;

// ---------- UTILIDADES ----------

function $(id) {
  return document.getElementById(id);
}

function formatTokens(raw) {
  // En MWT5 usamos 0 decimales → es directo.
  return Number(raw).toLocaleString("es-ES");
}

// ---------- CARGA INICIAL (MODO LECTURA) ----------

async function loadTokenInfo() {
  try {
    $("contractAddress").textContent = CONTRACT_ADDRESS;

    const [name, symbol, decimals, totalSupply, cap] = await Promise.all([
      contractRead.methods.name().call(),
      contractRead.methods.symbol().call(),
      contractRead.methods.decimals().call(),
      contractRead.methods.totalSupply().call(),
      contractRead.methods.cap().call(),
    ]);

    $("tokenName").textContent = name;
    $("tokenSymbol").textContent = symbol;
    $("tokenDecimals").textContent = decimals;

    $("totalSupply").textContent = formatTokens(totalSupply);
    $("maxSupply").textContent = formatTokens(cap);
  } catch (err) {
    console.error("Error cargando info del token:", err);
  }
}

// ---------- CONSULTA DE BALANCE ----------

async function handleBalanceForm(e) {
  e.preventDefault();
  const addr = $("balanceAddress").value.trim();

  if (!addr) {
    $("balanceResult").textContent = "Introduce una dirección válida.";
    return;
  }

  try {
    const balance = await contractRead.methods.balanceOf(addr).call();
    $("balanceResult").textContent =
      `Balance de ${addr.slice(0, 6)}…${addr.slice(-4)} → ${formatTokens(balance)} MWT5`;
  } catch (err) {
    console.error("Error consultando balance:", err);
    $("balanceResult").textContent = "Error consultando balance (revisa la dirección y la red).";
  }
}

// ---------- SIMULADOR EDUCATIVO ----------

function handleSimulatorForm(e) {
  e.preventDefault();

  const tokens = Number($("simTokens").value || 0);
  const years = Number($("simYears").value || 0);
  const basePrice = Number($("simBasePrice").value || 0);

  if (tokens <= 0 || years < 0 || basePrice <= 0) {
    $("simulatorOutput").textContent = "Introduce valores válidos.";
    return;
  }

  // Regla simplificada, alineada con lo que definimos:
  // 0–1 años: 1.00x
  // 1–2 años: 1.05x
  // 2–3 años: 1.10x
  // 3–4 años: 1.15x
  // >4 años: 1.20x (+ bonus fidelidad 10% sobre tokens)
  let multiplier = 1.0;
  if (years >= 1 && years < 2) multiplier = 1.05;
  else if (years >= 2 && years < 3) multiplier = 1.10;
  else if (years >= 3 && years < 4) multiplier = 1.15;
  else if (years >= 4) multiplier = 1.20;

  const teoreticalUnitPrice = basePrice * multiplier;
  const baseValue = tokens * basePrice;
  const valueWithMultiplier = tokens * teoreticalUnitPrice;

  let loyaltyBonusTokens = 0;
  if (years >= 4) {
    loyaltyBonusTokens = Math.floor(tokens * 0.10); // 10% extra
  }

  const output = `
    <p><strong>Escenario simulado:</strong></p>
    <ul>
      <li>Tokens: <strong>${tokens.toLocaleString("es-ES")} MWT5</strong></li>
      <li>Tiempo holdeando: <strong>${years} año(s)</strong></li>
      <li>Multiplicador teórico aplicado: <strong>${multiplier.toFixed(2)}x</strong></li>
      <li>Valor simbólico inicial: <strong>${basePrice.toFixed(2)}</strong> unidades por token</li>
      <li>Valor simbólico teórico actual: <strong>${teoreticalUnitPrice.toFixed(2)}</strong> unidades por token</li>
      <li>Valor total inicial: <strong>${baseValue.toFixed(2)}</strong> unidades</li>
      <li>Valor total teórico actual: <strong>${valueWithMultiplier.toFixed(2)}</strong> unidades</li>
      ${
        loyaltyBonusTokens > 0
          ? `<li>Bonus fidelidad ≥ 4 años: <strong>+${loyaltyBonusTokens.toLocaleString("es-ES")} MWT5</strong></li>`
          : "<li>Bonus fidelidad: aún no aplicable (requiere ≥ 4 años).</li>"
      }
    </ul>
    <p class="small muted">
      Todo este cálculo es <strong>educativo</strong> y se basa en reglas
      simplificadas. No representa un precio real de mercado.
    </p>
  `;

  $("simulatorOutput").innerHTML = output;
}

// ---------- CONEXIÓN WALLET / MODO WEB3 ----------

async function connectWallet() {
  if (!window.ethereum) {
    alert("No se ha detectado una wallet Web3 (MetaMask). Instálala y recarga la página.");
    return;
  }

  try {
    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    });
    currentAccount = accounts[0];

    web3Write = new Web3(window.ethereum);
    contractWrite = new web3Write.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS);

    $("currentAccount").textContent = currentAccount;
    $("web3Status").classList.remove("status--disconnected");
    $("web3Status").classList.add("status--connected");
    $("web3Status").innerHTML = `<strong>Estado:</strong> wallet conectada (${currentAccount.slice(
      0,
      6
    )}…${currentAccount.slice(-4)}).`;

    $("web3Panel").classList.remove("disabled");

    // Habilitamos botones de owner si la cuenta conectada es el owner real
    try {
      const owner = await contractRead.methods.owner().call();
      if (owner.toLowerCase() === currentAccount.toLowerCase()) {
        $("ownerBuybackButton").disabled = false;
        $("earlyCancelButton").disabled = false;
      }
    } catch (err) {
      console.warn("No se pudo comprobar el owner:", err);
    }
  } catch (err) {
    console.error("Error conectando wallet:", err);
  }
}

// Transferencia básica (solo cuando hay wallet)
async function handleTransferForm(e) {
  e.preventDefault();
  if (!contractWrite || !currentAccount) {
    alert("Conecta primero tu wallet.");
    return;
  }

  const to = $("transferTo").value.trim();
  const amount = Number($("transferAmount").value || 0);

  if (!to || amount <= 0) {
    alert("Introduce dirección destino y cantidad válida.");
    return;
  }

  try {
    await contractWrite.methods.transfer(to, amount).send({ from: currentAccount });
    alert("Transferencia enviada. Revisa Sepolia / Etherscan para ver la transacción.");
    $("transferTo").value = "";
    $("transferAmount").value = "";
    // Actualizamos supply / balances si quieres, de momento solo refrescamos datos generales
    loadTokenInfo();
  } catch (err) {
    console.error("Error en transfer:", err);
    alert("Error al enviar la transacción. Revisa la consola para más detalles.");
  }
}

// Esqueletos para las acciones educativas (owner).
// Aquí SOLO dejamos el esqueleto de JS; cuando cerremos nombres exactos de las
// funciones Solidity de recompra / cancelación, los llenamos.

async function handleOwnerBuyback() {
  if (!contractWrite || !currentAccount) {
    alert("Conecta primero tu wallet.");
    return;
  }
  alert(
    "Esqueleto listo para la función de recompra.\n" +
      "En cuanto confirmemos el nombre exacto en el contrato (por ejemplo ownerBuyback()), " +
      "conectamos aquí la llamada send()."
  );
}

async function handleEarlyCancel() {
  if (!contractWrite || !currentAccount) {
    alert("Conecta primero tu wallet.");
    return;
  }
  alert(
    "Esqueleto listo para la función de cancelación 24h.\n" +
      "En cuanto confirmemos la función Solidity concreta, la llamamos desde aquí."
  );
}

// ---------- INICIALIZACIÓN ----------

window.addEventListener("DOMContentLoaded", () => {
  // Datos iniciales desde la blockchain (sin wallet)
  loadTokenInfo();

  // Eventos DOM
  $("balanceForm").addEventListener("submit", handleBalanceForm);
  $("simulatorForm").addEventListener("submit", handleSimulatorForm);
  $("connectButton").addEventListener("click", connectWallet);
  $("transferForm").addEventListener("submit", handleTransferForm);
  $("ownerBuybackButton").addEventListener("click", handleOwnerBuyback);
  $("earlyCancelButton").addEventListener("click", handleEarlyCancel);
});

