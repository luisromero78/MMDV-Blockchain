/**
 * MMDV · Bloque reutilizable de Recursos Técnicos
 * Uso:
 * recursosMMDV({
 *   titulo: "Recursos técnicos",
 *   pdf: "Documentacion_Reto2_LuisRomero_MMDV-clean.pdf",
 *   presentacion: "MMDV_Reto2_Presentacion_v4.pdf",
 *   codigo: "Reto2_LuisRomero.py",
 *   csv: "resultados_reto2_timings.csv",
 *   otros: [
 *     { texto: "Resumen visual (PNG)", icono: "🖼️", link: "./visual_xrpl.png" }
 *   ]
 * });
 */

function recursosMMDV(cfg) {
  const c = document.getElementById("recursos");
  if (!c) return;

  let html = `
  <section class="card">
    <h2>${cfg.titulo || "Recursos técnicos"}</h2>
    <div class="btns">
  `;

  if (cfg.pdf)
    html += `<a class="btn" href="${cfg.pdf}" download>📄 Documentación técnica (PDF)</a>`;
  if (cfg.presentacion)
    html += `<a class="btn ghost" href="${cfg.presentacion}" download>🖥️ Presentación (PDF)</a>`;
  if (cfg.codigo)
    html += `<a class="btn ghost" href="${cfg.codigo}" download>🧱 Código fuente (Solidity)</a>`;
  if (cfg.csv)
    html += `<a class="btn ghost" href="${cfg.csv}" download>📊 Resultados (CSV)</a>`;

  if (cfg.otros && Array.isArray(cfg.otros)) {
    cfg.otros.forEach(o => {
      html += `<a class="btn ghost" href="${o.link}" download>${o.icono || "📁"} ${o.texto}</a>`;
    });
  }

  html += `
    </div>
  </section>
  `;

  c.innerHTML = html;
}
