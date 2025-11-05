// app.js — Reto 5 (dApp Web3) • ESM + CSP-safe
import { BrowserProvider, Contract } from "https://esm.sh/ethers@6.13.2";

// ====== CONFIGURA TU CONTRATO ======
const CONTRACT_ADDRESS = "0xFC33326E9256054dA108d88A17Bc51d6adB414dc" ; // <-- tu address (Sepolia)

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
    $$('[data-connect]').forEach(b => b.disabled = true);
    return;
  }

  // 👉 atamos TODOS los botones que tengan data-connect
  $$('[data-connect]').forEach(b => b.addEventListener('click', connect));
  $$('[data-disconnect]').forEach(b => b.addEventListener('click', disconnect));

  await updateNetworkUI();

  ethereum.on('chainChanged', ()=> window.location.reload());
  ethereum.on('accountsChanged', async ()=> { try{ await connect(); }catch(e){ console.error(e); }});
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
    signer   = await provider.getSigner();
    contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

    // Exponer para depuración opcional
    window.provider = provider; window.signer = signer; window.contract = contract; window.account = account;

    setState('Conectado');

    // Botones conectar/desconectar (si existen en tu HTML)
        // Mostrar/ocultar todos los conectores
$$('[data-connect]').forEach(b => b.style.display = 'none');
$$('[data-disconnect]').forEach(b => b.style.display = 'inline-block');


    await loadCandidates();
    await refreshStatusUI();        // <-- (1) estado y permisos UI
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
  $$('[data-connect]').forEach(b => b.style.display = 'inline-block');
$$('[data-disconnect]').forEach(b => b.style.display = 'none');

  setState('Desconectado');
  log('👋 Wallet desconectada (visual).');
}

// ====== ESTADO/UX ======
async function refreshStatusUI() {
  try {
    let isOpen = true, voted = false, isOwner = false;

    if (hasFn('votingOpen'))  isOpen  = await contract.votingOpen();
    if (hasFn('hasVoted'))    voted   = account ? await contract.hasVoted(account) : false;
    if (hasFn('owner'))       isOwner = account ? (await contract.owner()).toLowerCase() === account.toLowerCase() : false;

    const estado = isOpen ? 'Abierta' : 'Cerrada';
    setState(estado + (voted ? ' · Ya has votado' : ''));

    // Botón Cerrar (solo owner y abierta)
    const btnClose = $('#btnClose');
    if (btnClose){
      btnClose.style.display = (isOwner && isOpen) ? 'inline-block' : 'none';
      btnClose.onclick = async () => {
        try{
          setState('Cerrando…');
          const tx = await contract.closeVoting();
          log(`⛓️ Tx enviada: ${tx.hash}\nEsperando confirmación…`);
          await tx.wait();
          setState('Cerrada');
          await loadCandidates();
          await refreshStatusUI();
        }catch(err){
          console.error(err);
          log('❌ No se pudo cerrar la votación.');
          setState('Listo');
        }
      };
    }

    // Deshabilitar todos los botones “Votar” si está cerrada o ya votó
    $$('#cards button').forEach(b => { b.disabled = (!isOpen || voted); });

  } catch (e) {
    console.error(e);
  }
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

    if (hasFn('getCandidates')){
      list = await contract.getCandidates();
      list = list.map((c, idx)=> ({
        id: Number(c.id ?? idx),
        name: String(c.name ?? c[0] ?? `Candidato ${idx+1}`),
        votes: Number(c.votes ?? c[1] ?? 0)
      }));
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

  // primera pasada de estado/permiso si ya hay contrato/account
  refreshStatusUI().catch(()=>{});
}

async function onVote(ev){
  const id = Number(ev.currentTarget.getAttribute('data-id'));
  if (!Number.isFinite(id)) return;

  try{
    await precheckCanVote(id);
    setState('Firmando…');
    log(`📝 Enviando voto para ID ${id}…`);

    const tx = await contract.vote(id); // si tu contrato fuese 1-based: vote(id+1)
    log(`⛓️  Tx enviada: ${tx.hash}\nEsperando confirmación…`);
    ev.currentTarget.disabled = true;

    const receipt = await tx.wait();
    if (receipt?.status === 1){
      log(`✅ Voto confirmado en bloque ${receipt.blockNumber}.`);
      await loadCandidates();
      await refreshStatusUI();      // <-- (2) tras votar, refresca estado
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
        provider.on(filter, async ()=>{
          await loadCandidates();
          await refreshStatusUI();  // <-- (3) al llegar evento, refresca estado
        });
        log('🔔 Suscrito a eventos VoteCast.');
      }
    }catch{/* opcional */}
  }catch{/* opcional */}
}

  }catch{/* opcional */}
}
