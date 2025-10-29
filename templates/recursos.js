document.addEventListener("DOMContentLoaded", () => {
  const cont = document.getElementById("recursos");
  if (!cont) return;

  cont.innerHTML = `
  <section class="card">
    <h2>Recursos técnicos</h2>
    <div class="btns">
      <a class="btn" href="./Documentacion_Reto2_LuisRomero_MMDV-clean.pdf" download>📄 Documentación técnica (PDF)</a>
      <a class="btn ghost" href="./MMDV_Reto2_Presentacion_v4.pdf" download>🖥️ Presentación (PDF)</a>
      <a class="btn ghost" href="./Reto2_LuisRomero.py" download>🐍 Código Python</a>
      <a class="btn ghost" href="./resultados_reto2_timings.csv" download>📊 CSV de tiempos</a>
    </div>
  </section>
  `;
});
