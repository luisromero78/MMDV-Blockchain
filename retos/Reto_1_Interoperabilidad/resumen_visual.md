flowchart LR
  subgraph XRPL["XRP Ledger (RPCA · 3–5s · <0.0002 USD)"]
  end

  RippleNet["RippleNet / ISO 20022<br/>Banca tradicional"]:::node
  CBDC["CBDC Platform<br/>Instituciones · Stablecoins"]:::node
  EVM["Ethereum / EVM Sidechain<br/>Smart Contracts (Solidity)"]:::node
  RWA["RWA & Stablecoins<br/>Tokenización multi-red"]:::node

  RippleNet <--> XRPL
  CBDC <--> XRPL
  XRPL <--> EVM
  XRPL <--> RWA

  classDef node fill:#1a1b21,stroke:#7A1535,stroke-width:2,color:#fff
  classDef default fill:#111216,stroke:#7A1535,color:#fff

