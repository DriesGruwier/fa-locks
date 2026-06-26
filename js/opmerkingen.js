// ── Opmerkingen via GitHub Issues ─────────────────────────────
// Elke pagina krijgt een label op basis van het pad
// bv. shock/plaatsingslogica.html → label: shock-plaatsingslogica

function getPageLabel() {
  const path = window.location.pathname;
  const parts = path.split('/').filter(Boolean);
  const filename = parts[parts.length - 1].replace('.html', '');
  const dir = parts.length > 1 ? parts[parts.length - 2] : 'root';
  if (dir === filename || dir === 'fa-locks') return filename;
  return `${dir}-${filename}`;
}

function getPageTitle() {
  return document.querySelector('h1')?.textContent?.trim() || document.title;
}

const API = 'https://api.github.com';

function headers() {
  return {
    'Authorization': `token ${FA_CONFIG.github_token}`,
    'Accept': 'application/vnd.github.v3+json',
    'Content-Type': 'application/json'
  };
}

function repoBase() {
  return `${API}/repos/${FA_CONFIG.github_user}/${FA_CONFIG.github_repo}`;
}

async function ensureLabel(label) {
  try {
    await fetch(`${repoBase()}/labels/${encodeURIComponent(label)}`, { headers: headers() });
  } catch(e) {}
  // create if not exists (will fail silently if already exists)
  await fetch(`${repoBase()}/labels`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ name: label, color: '2563eb' })
  });
}

async function loadOpmerkingen(label) {
  const url = `${repoBase()}/issues?labels=${encodeURIComponent(label)}&state=open&per_page=50`;
  const r = await fetch(url, { headers: headers() });
  if (!r.ok) throw new Error(`GitHub API fout: ${r.status}`);
  return await r.json();
}

async function addOpmerking(label, tekst, auteur) {
  await ensureLabel(label);
  const title = `[${getPageTitle()}] ${tekst.substring(0, 60)}${tekst.length > 60 ? '…' : ''}`;
  const body = `**Pagina:** ${getPageTitle()}\n**Auteur:** ${auteur}\n\n${tekst}`;
  const r = await fetch(`${repoBase()}/issues`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ title, body, labels: [label] })
  });
  if (!r.ok) throw new Error(`Kon opmerking niet toevoegen: ${r.status}`);
  return await r.json();
}

async function closeOpmerking(issueNumber) {
  const r = await fetch(`${repoBase()}/issues/${issueNumber}`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify({ state: 'closed' })
  });
  if (!r.ok) throw new Error(`Kon opmerking niet sluiten: ${r.status}`);
}

function renderOpmerkingen(container, issues, label) {
  const list = container.querySelector('.opm-list');
  list.innerHTML = '';

  if (issues.length === 0) {
    list.innerHTML = '<p class="opm-empty">Geen opmerkingen voor deze pagina.</p>';
    return;
  }

  issues.forEach(issue => {
    // Extract auteur from body
    const auteurMatch = issue.body?.match(/\*\*Auteur:\*\* (.+)/);
    const auteur = auteurMatch ? auteurMatch[1] : issue.user.login;
    const tekst = issue.body?.split('\n\n').slice(1).join('\n\n') || issue.title;
    const datum = new Date(issue.created_at).toLocaleDateString('nl-BE', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    const el = document.createElement('div');
    el.className = 'opm-item';
    el.innerHTML = `
      <div class="opm-meta">
        <span class="opm-auteur">${escHtml(auteur)}</span>
        <span class="opm-datum">${datum}</span>
        <a class="opm-link" href="${issue.html_url}" target="_blank">#${issue.number}</a>
        <button class="opm-close" data-issue="${issue.number}" title="Markeer als opgelost">✓ Opgelost</button>
      </div>
      <div class="opm-tekst">${escHtml(tekst).replace(/\n/g, '<br>')}</div>
    `;
    list.appendChild(el);
  });

  list.querySelectorAll('.opm-close').forEach(btn => {
    btn.addEventListener('click', async () => {
      const num = btn.dataset.issue;
      btn.textContent = '…';
      btn.disabled = true;
      try {
        await closeOpmerking(num);
        await refreshOpmerkingen(container, label);
      } catch(e) {
        btn.textContent = 'Fout';
      }
    });
  });
}

async function refreshOpmerkingen(container, label) {
  const list = container.querySelector('.opm-list');
  list.innerHTML = '<p class="opm-empty">Laden…</p>';
  try {
    const issues = await loadOpmerkingen(label);
    renderOpmerkingen(container, issues, label);
    container.querySelector('.opm-count').textContent = issues.length;
  } catch(e) {
    list.innerHTML = `<p class="opm-empty opm-error">Kon opmerkingen niet laden. Controleer config.js.<br><small>${e.message}</small></p>`;
  }
}

function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function injectOpmerkingPanel() {
  if (!FA_CONFIG.github_token || !FA_CONFIG.github_user || !FA_CONFIG.github_repo) return;

  const label = getPageLabel();
  const main = document.querySelector('main.main');
  if (!main) return;

  const panel = document.createElement('div');
  panel.className = 'opm-panel';
  panel.innerHTML = `
    <div class="opm-header" id="opm-toggle">
      <span class="opm-title">💬 Opmerkingen</span>
      <span class="opm-count">…</span>
      <span class="opm-chevron">▶</span>
    </div>
    <div class="opm-body" id="opm-body" style="display:none">
      <div class="opm-list"><p class="opm-empty">Laden…</p></div>
      <div class="opm-form">
        <input class="opm-auteur-input" type="text" placeholder="Jouw naam" maxlength="50">
        <textarea class="opm-input" placeholder="Voeg een opmerking toe…" rows="3"></textarea>
        <button class="opm-submit">Toevoegen</button>
        <span class="opm-feedback"></span>
      </div>
    </div>
  `;
  const footer = main.querySelector(".doc-footer");
  if (footer) {
    main.insertBefore(panel, footer);
  } else {
    main.appendChild(panel);
  }

  const toggle = panel.querySelector('#opm-toggle');
  const body = panel.querySelector('#opm-body');
  const chevron = panel.querySelector('.opm-chevron');
  let loaded = false;

  toggle.addEventListener('click', async () => {
    const open = body.style.display === 'none';
    body.style.display = open ? 'block' : 'none';
    chevron.style.transform = open ? 'rotate(90deg)' : '';
    if (open && !loaded) {
      loaded = true;
      await refreshOpmerkingen(panel, label);
    }
  });

  // load count on init
  loadOpmerkingen(label).then(issues => {
    panel.querySelector('.opm-count').textContent = issues.length;
  }).catch(() => {
    panel.querySelector('.opm-count').textContent = '?';
  });

  panel.querySelector('.opm-submit').addEventListener('click', async () => {
    const auteur = panel.querySelector('.opm-auteur-input').value.trim() || 'Anoniem';
    const tekst = panel.querySelector('.opm-input').value.trim();
    const feedback = panel.querySelector('.opm-feedback');
    if (!tekst) return;

    const btn = panel.querySelector('.opm-submit');
    btn.disabled = true;
    btn.textContent = '…';
    feedback.textContent = '';

    try {
      await addOpmerking(label, tekst, auteur);
      panel.querySelector('.opm-input').value = '';
      feedback.textContent = '✓ Opmerking toegevoegd';
      feedback.style.color = 'var(--green)';
      await refreshOpmerkingen(panel, label);
    } catch(e) {
      feedback.textContent = `Fout: ${e.message}`;
      feedback.style.color = 'var(--red)';
    } finally {
      btn.disabled = false;
      btn.textContent = 'Toevoegen';
    }
  });
}

document.addEventListener('DOMContentLoaded', injectOpmerkingPanel);
