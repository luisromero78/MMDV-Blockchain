function footerMMDV() {
  const container = document.getElementById('mmdv-footer');
  if (!container) return;

  container.innerHTML = `
    <footer class="footer-mmdv">
      © 2025 MMDV Analytics — Research · Web3 · On-Chain Intelligence · Luis Eduardo Romero
    </footer>
  `;
}
