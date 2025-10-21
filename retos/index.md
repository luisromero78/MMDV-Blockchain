<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Retos Blockchain · MMDV</title>
  <meta name="description" content="Retos, estudios y experimentos técnicos – MMDV Blockchain.">
  <style>
  :root{--ink:#111;--muted:#5c5c5c;--accent:#7a1535;--bg:#fff}
  *{box-sizing:border-box}
  body{margin:0;font-family:Inter,ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:var(--ink);background:var(--bg)}
  .wrap{max-width:880px;margin:0 auto;padding:44px 20px}
  h1{margin:0 0 4px;font-size:26px;letter-spacing:.2px;font-weight:600}
  h2{margin:28px 0 10px;font-size:18px;font-weight:600;color:var(--ink)}
  p{color:var(--muted);line-height:1.75}
  a{color:var(--accent);text-decoration:none}
  a:hover{text-decoration:underline}
  header{padding:26px 20px;border-bottom:1px solid #eee}
  nav a{margin-right:16px}
  .meta{color:var(--muted);font-size:14px;margin-top:6px;letter-spacing:.2px}
  .lead{max-width:760px}
  .list{margin:24px 0 8px;padding:0;list-style:none}
  .item{padding:18px 0;border-bottom:1px solid #eee}
  .item:last-child{border-bottom:none}
  footer{border-top:1px solid #eee;margin-top:40px;padding:24px 20px;color:var(--muted);font-size:14px}
  /* detalle fino en títulos de secciones */
  section > h2{position:relative;padding-top:6px}
  section > h2::after{content:"";display:block;width:36px;height:2px;background:var(--accent);margin-top:10px;border-radius:2px;opacity:.2}
  /* Hover elegante sin “saltitos” (opcional: comenta la siguiente línea si quieres) */
  .list a:hover {color: var(--ink); /* letter-spacing: 0.3px; */ transition: color 0.15s ease-in-out;}
  </style>
</head>
<body>
  <header>
    <div class="wrap">
      <h1>MMDV-Blockchain</h1>
      <p class="meta">Retos · Estudios · Experimentos técnicos</p>
      <nav>
        <a href="../">Inicio</a>
        <a href="../projects.html">Proyectos</a>
        <a href="../certifications.html">Certificaciones</a>
        <a href="../about.html">Sobre mí</a>
      </nav>
    </div>
  </header>

  <main class="wrap">
    <h2 style="color:var(--accent);font-weight:600;margin-top:0">Retos Blockchain — LuisRo</h2>
    <p class="lead">
      Colección de <strong>retos, estudios y experimentos técnicos</strong> del curso
      <em>Blockchain Nivel 3 (Fundae – Odisea)</em> y del programa <em>OnChain Analysis & AI</em>.
      Enfoque editorial, limpio y profesional.
    </p>
    <p class="lead">Cada reto combina <em>análisis técnico</em>, <em>aplicación práctica</em> (XRPL, Ethereum, Cosmos…) y <em>visión estratégica</em>.</p>

    <section>
      <h2>Retos disponibles</h2>
      <ul class="list">

        <li class="item">
          <div><strong>Reto 1 — Interoperabilidad entre cadenas</strong></div>
          <div class="meta">Polkadot · Cosmos · Chainlink · XRP Ledger</div>
          <p>Puentes entre redes y conexión con el sistema financiero tradicional.</p>
          <a href="./Reto_1_Interoperabilidad/">Abrir Reto 1 &rarr;</a>
        </li>

        <li class="item">
          <div><strong>Reto 2 — Criptografía y seguridad</strong></div>
          <div class="meta">AES · RSA · SHA-256/Keccak · Firmas · Merkle · 51%/Sybil/Eclipse</div>
          <p>Bases matemáticas de la confianza y principales vectores de ataque.</p>
          <a href="./Reto_2_Criptografia_y_Seguridad/">Abrir Reto 2 &rarr;</a>
        </li>

        <li class="item">
          <div><strong>Reto 3 — Cadena & Solidity</strong></div>
          <div class="meta">EVM · Gas · Estado global · DApps · Contratos</div>
          <p>Del bloque al contrato: ejecución determinista y lógica programable.</p>
          <a href="./Reto_3_Cadena_y_Solidity/">Abrir Reto 3 &rarr;</a>
        </li>

      </ul>
    </section>

    <section>
      <h2>Referencias base</h2>
      <p>
        Antonopoulos · Drescher · Tapscott ·
        <a href="https://xrpl.org" target="_blank" rel="noopener">XRPL Docs</a> ·
        <a href="https://soliditylang.org" target="_blank" rel="noopener">Solidity</a> ·
        <a href="https://ethereum.org/en/whitepaper" target="_blank" rel="noopener">Ethereum Whitepaper</a>
      </p>
    </section>
  </main>

  <footer>
    <div class="wrap">© 2025 Luis Eduardo Romero · MMDV — Licencia CC BY 4.0</div>
  </footer>
</body>
</html>
