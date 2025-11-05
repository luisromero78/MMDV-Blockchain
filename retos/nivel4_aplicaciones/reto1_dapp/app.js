import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@6.13.2/dist/ethers.min.js";

  <script>
  // ====== CONFIGURA AQUÍ TU CONTRATO ======
  // 1) Pega la dirección del contrato desplegado en Sepolia (Reto 4)
  const CONTRACT_ADDRESS = "0xFC33326E9256054dA108d88A17Bc51d6adB414dc" ; // <-- reemplaza
  // 2) Pega el ABI del contrato (array JSON). Debe incluir, al menos:
  //    - getCandidates() -> (tuple(string name, uint256 votes, uint256 id)[])
  //      o bien totalCandidates() + candidates(uint256) -> (name, votes)
  //    - vote(uint256 id)
  //    - (opcional) hasVoted(address) view returns (bool)
  const CONTRACT_ABI = [
    {
      "inputs": [
        { "internalType": "string[]", "name": "_names", "type": "string[]" }
      ],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    {
      "anonymous": false,
      "inputs": [
        { "indexed": true, "internalType": "uint256", "name": "id", "type": "uint256" },
        { "indexed": false, "internalType": "string", "name": "name", "type": "string" }
      ],
      "name": "CandidateAdded",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        { "indexed": true, "internalType": "address", "name": "voter", "type": "address" },
        { "indexed": true, "internalType": "uint256", "name": "candidateId", "type": "uint256" }
      ],
      "name": "VoteCast",
      "type": "event"
    },
    { "anonymous": false, "inputs": [], "name": "VotingClosed", "type": "event" },
    { "anonymous": false, "inputs": [], "name": "VotingOpened", "type": "event" },
    {
      "inputs": [
        { "internalType": "uint256", "name": "a", "type": "uint256" },
        { "internalType": "uint256", "name": "b", "type": "uint256" }
      ],
      "name": "addPure",
      "outputs": [ { "internalType": "uint256", "name": "", "type": "uint256" } ],
      "stateMutability": "pure",
      "type": "function"
    },
    {
      "inputs": [ { "internalType": "uint256", "name": "", "type": "uint256" } ],
      "name": "candidates",
      "outputs": [
        { "internalType": "string", "name": "name", "type": "string" },
        { "internalType": "uint256", "name": "votes", "type": "uint256" }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "candidatesCount",
      "outputs": [ { "internalType": "uint256", "name": "", "type": "uint256" } ],
      "stateMutability": "view",
      "type": "function"
    },
    { "inputs": [], "name": "closeVoting", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
    {
      "inputs": [ { "internalType": "uint256", "name": "id", "type": "uint256" } ],
      "name": "getCandidate",
      "outputs": [
        { "internalType": "string", "name": "name", "type": "string" },
        { "internalType": "uint256", "name": "votes", "type": "uint256" }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [ { "internalType": "address", "name": "", "type": "address" } ],
      "name": "hasVoted",
      "outputs": [ { "internalType": "bool", "name": "", "type": "bool" } ],
      "stateMutability": "view",
      "type": "function"
    },
    { "inputs": [], "name": "owner", "outputs": [ { "internalType": "address", "name": "", "type": "address" } ], "stateMutability": "view", "type": "function" },
    { "inputs": [ { "internalType": "uint256", "name": "candidateId", "type": "uint256" } ], "name": "vote", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
    { "inputs": [], "name": "votingOpen", "outputs": [ { "internalType": "bool", "name": "", "type": "bool" } ], "stateMutability": "view", "type": "function" }
  ];
  // Si tu contrato NO tiene getCandidates() pero sí totalCandidates()/candidates(i),
  // el loader alternativo intentará usar ese patrón.

  // ====== CONSTANTES ======
  const TARGET_CHAIN_ID = 11155111; // Sepolia
  const ZERO = 0n;

  // ====== ESTADO GLOBAL ======
  let provider, signer, contract; // ethers v6 UMD expone "ethers"
  let account = null;

  const $ = (sel)=>document.querySelector(sel);
  const $$ = (sel)=>document.querySelectorAll(sel);
  const log = (msg)=>{ const el = $('#log'); el.textContent = (typeof msg === 'string'? msg : JSON.stringify(msg,null,2)); };
  const setState = (t)=> $('#state').textContent = t;

  // ====== INICIO ======
  window.addEventListener('DOMContentLoaded', async () => {
    $('#addr').textContent = CONTRACT_ADDRESS;

    if (!window.ethereum){
      setState('MetaMask no detectado');
      log('Instala MetaMask para continuar.');
      $('#btnConnect').disabled = true;
      return;
    }

    $('#btnConnect').addEventListener('click', connect);

    // Si ya hay cuentas conectadas, inicializamos
    try {
      const accs = await ethereum.request({ method:'eth_accounts' });
      if (accs && accs.length){
        await connect();
      } else {
        updateNetworkUI();
      }
    } catch(err){ log(err); }

    // Eventos de red/cuentas
    ethereum.on('chainChanged', ()=> window.location.reload());
    ethereum.on('accountsChanged', ()=> window.location.reload());
  });

  async function connect(){
    try{
      const accs = await ethereum.request({ method:'eth_requestAccounts' });
      account = accs[0];
      $('#accountLine').textContent = `Conectado: ${short(account)}`;

      // Comprobar red
      const chainIdHex = await ethereum.request({ method:'eth_chainId' });
      const chainId = Number(chainIdHex);
      $('#net').textContent = `${chainId} ${chainId===TARGET_CHAIN_ID? '(Sepolia)': '(otra red)'}`;
      if (chainId !== TARGET_CHAIN_ID){
        setState('Cámbiate a Sepolia');
        await ensureSepolia();
        return; // el reload nos traerá de vuelta
      }

      provider = new ethers.BrowserProvider(window.ethereum);
      signer = await provider.getSigner();
      contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      setState('Conectado');
      await loadCandidates();
      bindEvents();
    }catch(err){
      console.error(err); log('❌ Error al conectar.'); setState('Error de conexión');
    }
  }

  async function ensureSepolia(){
    try{
      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0xaa36a7' /* 11155111 */ }]
      });
    }catch(switchError){
      if (switchError.code === 4902){
        // añadir red
        await ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: '0xaa36a7', chainName: 'Sepolia',
            nativeCurrency: { name: 'Sepolia ETH', symbol: 'ETH', decimals: 18 },
            rpcUrls: ['https://rpc.sepolia.org'],
            blockExplorerUrls: ['https://sepolia.etherscan.io']
          }]
        });
      } else {
        log('Cámbiate manualmente a Sepolia en MetaMask.');
      }
    }
  }

  function short(addr){ return addr? addr.slice(0,6) + '…' + addr.slice(-4) : '—'; }

  async function loadCandidates(){
    setState('Cargando candidatos…');
    $('#cards').innerHTML = '';
    $('#empty').style.display = 'none';

    try {
      let list = [];
      // Ruta A: getCandidates() devuelve array de tuplas { name, votes, id }
      if (hasFn('getCandidates')){
        list = await contract.getCandidates();
        // Normalizar posibles formatos
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
        throw new Error('No encuentro funciones para listar candidatos. Añade getCandidates() o totalCandidates()+candidates(i) al ABI.');
      }

      const totalVotes = list.reduce((a,b)=> a + (Number(b.votes)||0), 0);
      renderCards(list, totalVotes);
      setState('Listo');
      log('✅ Candidatos cargados.');
    } catch(err){
      console.error(err);
      setState('Error');
      $('#empty').style.display = 'block';
      log('❌ No se pudo cargar la lista. Revisa la consola y el ABI.');
    }
  }

  function renderCards(list, totalVotes){
    const host = $('#cards');
    host.innerHTML = '';
    const safeTotal = totalVotes>0? totalVotes: 1; // evitar división por 0

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

  function esc(s){ return String(s).replace(/[&<>"']/g, m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m])); }

  function hasFn(name){
    try { return contract?.interface?.getFunction(name) != null; } catch{ return false; }
  }

  async function onVote(ev){
    const id = Number(ev.currentTarget.getAttribute('data-id'));
    if (!Number.isFinite(id)) return;

    try{
      setState('Firmando…');
      log(`📝 Enviando voto para ID ${id}…`);

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
      if (String(err.message||'').includes('user rejected')) log('🛑 Firma rechazada por el usuario.');
      else log('❌ Error al votar. Revisa consola.');
    }finally{
      setState('Listo');
    }
  }

  function bindEvents(){
    try{
      if (contract && contract.filters){
        // Intentar suscripción al evento Voted(address,uint256) o VoteCast
        const tryEvents = ['Voted','VoteCast'];
        for (const evName of tryEvents){
          try{
            const filter = contract.filters[evName]?.();
            if (filter){
              provider.on(filter, (logObj)=>{
                // Actualizar silenciosamente tras eventos
                loadCandidates();
              });
              log(`🔔 Suscrito a eventos ${evName}.`);
              break;
            }
          }catch{/* continuar */}
        }
      }
    }catch{/* opcional */}
  }

  async function updateNetworkUI(){
    try{
      const cidHex = await ethereum.request({ method:'eth_chainId' });
      const cid = Number(cidHex);
      $('#net').textContent = `${cid} ${cid===TARGET_CHAIN_ID? '(Sepolia)': '(otra red)'}`;
    }catch{ $('#net').textContent = '—'; }
  }
  </script>
