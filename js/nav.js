function loadNav() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;

  // Bepaal het pad naar nav.html relatief aan de huidige pagina
  const depth = window.location.pathname.split('/').filter(Boolean).length - 1;
  const prefix = depth > 1 ? '../'.repeat(depth - 1) : './';
  const navUrl = prefix + 'nav.html';

  fetch(navUrl)
    .then(r => {
      if (!r.ok) throw new Error(`nav.html niet gevonden (${r.status})`);
      return r.text();
    })
    .then(html => {
      sidebar.innerHTML = html;
      // Markeer actieve link op basis van huidig pad
      const path = window.location.pathname;
      sidebar.querySelectorAll('a').forEach(a => {
        const href = a.getAttribute('href');
        if (!href) return;
        // Normaliseer beide paden voor vergelijking
        const normalHref = href.replace(/^\.\.\//, '/').replace(/^\.\//, '/');
        if (path.endsWith(normalHref.replace(/^\//, ''))) {
          a.classList.add('active');
        }
      });
    })
    .catch(e => console.warn('Nav laden mislukt:', e));
}

document.addEventListener('DOMContentLoaded', loadNav);
