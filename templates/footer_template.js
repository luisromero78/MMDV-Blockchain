function footerMMDV() {
  const container = document.getElementById('mmdv-footer');
  if (!container) return;

  container.innerHTML = `
    <footer class="mmdv-footer">
      <div class="footer-inner">
        <img src="/MMDV-Blockchain/assets/MMDV_white.png"
             alt="MMDV Logo"
             class="footer-logo">

        <div class="footer-text">
          <div>© 2025 MMDV Analytics — Research · Web3 · On-Chain Intelligence</div>
          <div class="footer-author">Luis Eduardo Romero</div>
        </div>
      </div>
    </footer>
  `;
}
