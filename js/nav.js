function loadNav() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;

  // Zoek de root van de site door nav.html te zoeken relatief aan huidige pagina
  // Werkt zowel lokaal als op GitHub Pages ongeacht subpad
  const scripts = document.querySelectorAll('script[src]');
  let navUrl = 'nav.html';
  
  scripts.forEach(s => {
    if (s.src.includes('nav.js')) {
      // nav.js zit in js/ dus root is één niveau hoger
      navUrl = s.src.replace(/js\/nav\.js.*$/, 'nav.html');
    }
  });

  fetch(navUrl)
    .then(r => {
      if (!r.ok) throw new Error(`nav.html niet gevonden op ${navUrl} (${r.status})`);
      return r.text();
    })
    .then(html => {
      sidebar.innerHTML = html;

      // Fix links: maak ze relatief aan huidige pagina
      const currentPath = window.location.pathname;
      const rootPath = navUrl.replace('nav.html', '');
      
      sidebar.querySelectorAll('a[href]').forEach(a => {
        const href = a.getAttribute('href');
        if (!href || href.startsWith('http')) return;
        
        // Zet href om naar absoluut pad vanuit root
        const absHref = rootPath + href;
        a.setAttribute('href', absHref);
        
        // Markeer actieve link
        if (currentPath === absHref || currentPath.endsWith('/' + href)) {
          a.classList.add('active');
        }
      });
    })
    .catch(e => console.warn('Nav laden mislukt:', e, navUrl));
}

document.addEventListener('DOMContentLoaded', loadNav);
