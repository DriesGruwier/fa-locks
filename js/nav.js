
function loadNav() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;
  // resolve nav.html path relative to root
  fetch('/nav.html')
    .then(r => r.text())
    .then(html => {
      sidebar.innerHTML = html;
      // mark active link based on current path
      const path = window.location.pathname;
      sidebar.querySelectorAll('a').forEach(a => {
        const href = a.getAttribute('href');
        if (href && path.endsWith(href.replace(/^\//, ''))) {
          a.classList.add('active');
        }
      });
    })
    .catch(e => console.warn('Nav load failed:', e));
}
document.addEventListener('DOMContentLoaded', loadNav);
