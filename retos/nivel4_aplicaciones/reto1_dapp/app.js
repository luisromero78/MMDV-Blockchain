// app.js  —  Reto 5 (dApp Web3) • ESM + CSP-safe
import { BrowserProvider, Contract } from "https://esm.sh/ethers@6.13.2";

// ====== CONFIGURA TU CONTRATO ======
const CONTRACT_ADDRESS = "0xPON_AQUI_TU_ADDRESS"; // <— reemplaza SOLO esto

// ABI pegado desde tu Voting.json (campo "abi")
const CONTRACT_ABI = [
  { "inputs":[{ "internalType":"string[]","name":"_names","type":"string[]"}], "stateMutability":"nonpayable","type":"constructor" },
  { "anonymous":false,"inputs":[{ "indexed":true,"internalType":"uint256","name":"id","type":"uint256"},{ "indexed":false,"internalType":"string","name":"name","type":"string"}],"name":"CandidateAdded","type":"event"},
  { "anonymous":false,"inputs":[{ "indexed":true,"internalType":"address","name":"voter","type":"address"},{ "indexed":true,"internalType":"uint256","name":"candidateId","type":"uint256"}],"name":"VoteCast","type":"event"},
  { "anonymous":false,"inputs":[],"name":"VotingClosed","type":"event"},
  { "anonymous":false,"inputs":[],"name":"VotingOpened","type":"event"},
  { "inputs":[{ "internalType":"uint256","name":"a","type":"uint256"},{ "internalType":"uint256","name":"b","type":"uint256"}],"name":"addPure","outputs":[{ "internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"pure","type":"function"},
  { "inputs":[{ "internalType":"uint256","name":"","type":"uint256"}],"name":"candidates","outputs":[{ "internalType":"string","name":"name","type":"string"},{ "internalType":"uint256","name":"votes","type":"uint256"}],"stateMutability":"view","type":"function"},
  { "inputs":[],"name":"candidatesCount","outputs":[{ "internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  { "inputs":[],"name":"closeVoting","outputs":[],"stateMutability":"nonpayable","type":"function"},
  { "inputs":[{ "internalType":"uint256","name":"id","type":"uint256"}],"name":"getCandidate","outputs":[{ "internalType":"string","name":"name","type":"string"},{ "internalType":"uint256","name":"votes","type":"uint256"}],"stateMutability":"view","type":"function"},
  { "inputs":[{ "internalType":"address","name":"","type":"address"}],"name":"hasVoted","outputs":[{ "internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},
  { "inputs":[],"name":"owner","outputs":[{ "internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
  { "inputs":[{ "internalType":"uint256","name":"candidateId","type":"uint256"}],"name":"vote","outputs":[],"stateMutability":"nonpayable","type":"function"},
  { "inputs":[],"name":"votingOpen","outputs":[{ "internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"}
];

// ====== CONSTANTES ======
const TARGET_CHAIN_ID = 11155111; // Sepolia
const ZERO = 0n;

// ====== ESTADO GLOBAL ======
let provider, signer, contract;
let account = null;

// ====== UTILS UI ======
const $  = (sel)=>document.querySelector(sel);
const $$ = (sel)=>document.querySelectorAll(sel);
const log = (msg)=>{ const el = $('#log'); el.textContent = (typeof msg === 'string'? msg : JSON.stringify(msg,null,2)); };
const setState = (t)=> $('#state').textContent = t;
const short = (addr)=> addr? `${addr.slice(0,6)}…${addr.slice(-4)}` : '—';
const esc = (s)=> String(s).replace(/[&<>\"']/g, m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]));
const hasFn = (name)=> { try { return contract?.interface?.getFunction(name) != null; } catch { return false; } };

// ====== BOOT ======
window.addEventListener('DOMContentLoaded', async () => {
  $('#addr').textContent = CONTRACT_ADDRESS || '—';

  if (!window.ethereum){
    setState('MetaMask no detectado');
    log('Instala MetaMask para continuar.');
    $('#btnConnect').disabled = true;
    return;
  }

  $('#btnConnect').addEventListener('click', connect);
  const btnDisc = $('#btnDisconnect');
  if (btnDisc) btnDisc.addEventListener('click', disconnect);

  try {
    const accs = await ethereum.request({ method:'eth_accounts' });
    if (accs && accs.length){ await connect(); } else { await updateNetworkUI(); }
  } catch(err){ console.error(err); }

  ethereum.on('chainChanged', ()=> window.location.reload());
  ethereum.on('accountsChanged', ()=> window.location.reload());
});

// ====== CONEXIÓN ======
async function connect(){
  try{
    const accs = await ethereum.request({ method:'eth_requestAccounts' });
    account = accs[0];
    $('#accountLine').textContent = `Conectado: ${short(account)}`;

    const chainIdHex = await ethereum.request({ method:'eth_chainId' });
    const chainId = Number(chainIdHex);
    $('#net').textContent = `${chainId} ${chainId===TARGET_CHAIN_ID? '(Sepolia)': '(otra red)'}`;
    if (chainId !== TARGET_CHAIN_ID){
      setState('Cámbiate a Sepolia');
      await ensureSepolia();
      return; // el reload nos traerá de vuelta
    }

    provider = new BrowserProvider(window.ethereum);
    signer = await provider.getSigner();
    contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

    // Exponer para depuración opcional
    window.provider = provider; window.signer = signer; window.contract = contract; window.account = account;

    setState('Conectado');

    // Botones conectar/desconectar (si existen en tu HTML)
    const btnConn = $('#btnConnect'); const btnDisc = $('#btnDisconnect');
    if (btnConn) btnConn.style.display = 'none';
    if (btnDisc) btnDisc.style.display = 'inline-block';

    await loadCandidates();
    bindEvents();
  }catch(err){
    console.error(err);
    log('❌ Error al conectar.');
    setState('Error de conexión');
  }
}

async function ensureSepolia(){
  try{
    await ethereum.request({ method:'wallet_switchEthereumChain', params:[{ chainId: '0xaa36a7' }] });
  }catch(switchError){
    if (switchError.code === 4902){
      await ethereum.request({
        method:'wallet_addEthereumChain',
        params:[{
          chainId:'0xaa36a7', chainName:'Sepolia',
          nativeCurrency:{ name:'Sepolia ETH', symbol:'ETH', decimals:18 },
          rpcUrls:['https://rpc.sepolia.org'],
          blockExplorerUrls:['https://sepolia.etherscan.io']
        }]
      });
    } else {
      log('Cámbiate manualmente a Sepolia en MetaMask.');
    }
  }
}

async function updateNetworkUI(){
  try{
    const cidHex = await ethereum.request({ method:'eth_chainId' });
    const cid = Number(cidHex);
    $('#net').textContent = `${cid} ${cid===TARGET_CHAIN_ID? '(Sepolia)': '(otra red)'}`;
  }catch{ $('#net').textContent = '—'; }
}

function disconnect(){
  account = null;
  $('#accountLine').textContent = '';
  $('#cards').innerHTML = '';
  const btnConn = $('#btnConnect'); const btnDisc = $('#btnDisconnect');
  if (btnConn) btnConn.style.display = 'inline-block';
  if (btnDisc) btnDisc.style.display = 'none';
  setState('Desconectado');
  log('👋 Wallet desconectada (visual).');
}

// ====== LÓGICA dApp ======
async function precheckCanVote(id){
  const chainId = Number(await ethereum.request({ method:'eth_chainId' }));
  if (chainId !== TARGET_CHAIN_ID) throw new Error('Red incorrecta: cámbiate a Sepolia');

  if (hasFn('votingOpen')) {
    const isOpen = await contract.votingOpen();
    if (!isOpen) throw new Error('Votación cerrada');
  }
  if (account && hasFn('hasVoted')) {
    const voted = await contract.hasVoted(account);
    if (voted) throw new Error('Ya has votado');
  }
  if (hasFn('candidatesCount')) {
    const total = Number(await contract.candidatesCount());
    if (!(Number.isFinite(id) && id >= 0 && id < total)) throw new Error('ID invalido');
  }
}

async function loadCandidates(){
  setState('Cargando candidatos…');
  $('#cards').innerHTML = '';
  $('#empty').style.display = 'none';

  try {
    let list = [];

    // Ruta A: getCandidates() — si existiera en otra versión
    if (hasFn('getCandidates')){
      list = await contract.getCandidates();
      list = list.map((c, idx)=> ({
        id: Number(c.id ?? idx),
        name: String(c.name ?? c[0] ?? `Candidato ${idx+1}`),
        votes: Number(c.votes ?? c[1] ?? 0)
      }));

    // Ruta B: TU ABI — candidatesCount() + getCandidate(i) | candidates(i)
    } else if (hasFn('candidatesCount')) {
      const total = Number(await contract.candidatesCount());
      for (let i=0;i<total;i++){
        let c;
        if (hasFn('getCandidate')) c = await contract.getCandidate(i);
        else if (hasFn('candidates')) c = await contract.candidates(i);
        else throw new Error('No encuentro getCandidate(i) ni candidates(i)');

        list.push({ id:i, name:String(c.name ?? c[0]), votes: Number(c.votes ?? c[1] ?? 0) });
      }
    } else {
      throw new Error('No encuentro funciones para listar candidatos. Añade getCandidates() o candidatesCount()+getCandidate(i)/candidates(i) al ABI.');
    }

    const totalVotes = list.reduce((a,b)=> a + (Number(b.votes)||0), 0);
    renderCards(list, totalVotes);
    setState('Listo');
    log('📜 Listo.');
  } catch(err){
    console.error(err);
    setState('Error');
    $('#empty').style.display = 'block';
    log('❌ No se pudo cargar la lista. Revisa consola y el ABI.');
  }
}

function renderCards(list, totalVotes){
  const host = $('#cards');
  host.innerHTML = '';
  const safeTotal = totalVotes>0? totalVotes: 1;

  list.forEach(c=>{
    const pct = Math.round((Number(c.votes||0) / safeTotal) * 100);
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <h3>${esc(c.name)}</h3>
      <div class="muted">Votos: <strong>${Number(c.votes||0)}</strong> · ${pct}%</div>
      <div class="bar" style="margin:10px 0 12px"><div class="fill" style="width:${pct}%"></div></div>
      <button data-id="${c.id}">Votar</button>
    `;
    host.appendChild(card);
  });

  host.querySelectorAll('button').forEach(btn=>{
    btn.addEventListener('click', onVote);
  });
}

async function onVote(ev){
  const id = Number(ev.currentTarget.getAttribute('data-id'));
  if (!Number.isFinite(id)) return;

  try{
    await precheckCanVote(id);
    setState('Firmando…');
    log(`📝 Enviando voto para ID ${id}…`);

    // Si tu contrato fuera 1-based, usa (id + 1)
    const tx = await contract.vote(id);
    log(`⛓️  Tx enviada: ${tx.hash}\nEsperando confirmación…`);
    ev.currentTarget.disabled = true;

    const receipt = await tx.wait();
    if (receipt?.status === 1){
      log(`✅ Voto confirmado en bloque ${receipt.blockNumber}.`);
      await loadCandidates();
    } else {
      log('⚠️ La transacción no se confirmó correctamente.');
      ev.currentTarget.disabled = false;
    }
  }catch(err){
    console.error(err);
    const msg = (err?.shortMessage || err?.reason || err?.message || '').toString();
    if (/Votaci[oó]n cerrada|Ya has votado|ID invalido/i.test(msg)) log(`❌ ${msg}`);
    else if (/user rejected/i.test(msg)) log('🛑 Firma rechazada por el usuario.');
    else log('❌ Error al votar. Revisa consola.');
  }finally{
    setState('Listo');
  }
}

function bindEvents(){
  try{
    if (!contract || !provider) return;
    // intenta suscribirse a VoteCast (tu contrato lo expone)
    try{
      const filter = contract.filters?.VoteCast?.();
      if (filter) {
        provider.on(filter, ()=> loadCandidates());
        log('🔔 Suscrito a eventos VoteCast.');
      }
    }catch{/* opcional */}
  }catch{/* opcional */}
}
