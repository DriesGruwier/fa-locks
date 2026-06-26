// ── Opmerkingen via Supabase ───────────────────────────────────
const SUPABASE_URL = 'https://ewngfbebbjkoxxnzdszi.supabase.co';
const SUPABASE_KEY = 'sb_publishable_gvMPW8mGuS7CnwIrImQrdw_6urrbVW9';

function getPageId() {
  const path = window.location.pathname;
  const parts = path.split('/').filter(Boolean);
  // Remove repo name (fa-locks) from path if present
  const filtered = parts.filter(p => p !== 'fa-locks');
  return filtered.join('/').replace('.html', '') || 'index';
}

async function loadOpmerkingen(pagina) {
  const url = `${SUPABASE_URL}/rest/v1/opmerkingen?pagina=eq.${encodeURIComponent(pagina)}&order=aangemaakt_op.asc`;
  const r = await fetch(url, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    }
  });
  if (!r.ok) throw new Error(`Supabase fout: ${r.status}`);
  return await r.json();
}

async function saveOpmerking(pagina, naam, tekst) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/opmerkingen`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({ pagina, naam, tekst })
  });
  if (!r.ok) throw new Error(`Opslaan mislukt: ${r.status}`);
}

function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDatum(iso) {
  return new Date(iso).toLocaleDateString('nl-BE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function renderOpmerkingen(listEl, items) {
  listEl.innerHTML = '';
  if (items.length === 0) {
    listEl.innerHTML = '<p class="opm-empty">Nog geen opmerkingen voor deze pagina.</p>';
    return;
  }
  items.forEach(item => {
    const el = document.createElement('div');
    el.className = 'opm-item';
    el.innerHTML = `
      <div class="opm-meta">
        <span class="opm-auteur">${escHtml(item.naam)}</span>
        <span class="opm-datum">${formatDatum(item.aangemaakt_op)}</span>
      </div>
      <div class="opm-tekst">${escHtml(item.tekst).replace(/\n/g, '<br>')}</div>
    `;
    listEl.appendChild(el);
  });
}

async function injectOpmerkingPanel() {
  const main = document.querySelector('main.main');
  if (!main) return;

  const pagina = getPageId();

  const panel = document.createElement('div');
  panel.className = 'opm-panel';
  panel.innerHTML = `
    <div class="opm-header" id="opm-toggle">
      <span class="opm-title">💬 Opmerkingen</span>
      <span class="opm-count opm-badge">…</span>
      <span class="opm-chevron">▶</span>
    </div>
    <div class="opm-body" style="display:none">
      <div class="opm-list"><p class="opm-empty">Laden…</p></div>
      <div class="opm-form">
        <input class="opm-naam" type="text" placeholder="Jouw naam" maxlength="60">
        <textarea class="opm-tekst-input" placeholder="Voeg een opmerking toe…" rows="3"></textarea>
        <div class="opm-form-footer">
          <button class="opm-submit">Toevoegen</button>
          <span class="opm-feedback"></span>
        </div>
      </div>
    </div>
  `;

  const footer = main.querySelector('.doc-footer');
  if (footer) main.insertBefore(panel, footer);
  else main.appendChild(panel);

  const header  = panel.querySelector('#opm-toggle');
  const body    = panel.querySelector('.opm-body');
  const chevron = panel.querySelector('.opm-chevron');
  const listEl  = panel.querySelector('.opm-list');
  const countEl = panel.querySelector('.opm-badge');
  const submit  = panel.querySelector('.opm-submit');
  const feedback = panel.querySelector('.opm-feedback');
  let loaded = false;

  // Load count on init
  loadOpmerkingen(pagina).then(items => {
    countEl.textContent = items.length;
  }).catch(() => { countEl.textContent = '?'; });

  // Toggle open/close
  header.addEventListener('click', async () => {
    const open = body.style.display === 'none';
    body.style.display = open ? 'block' : 'none';
    chevron.style.transform = open ? 'rotate(90deg)' : '';
    if (open && !loaded) {
      loaded = true;
      try {
        const items = await loadOpmerkingen(pagina);
        renderOpmerkingen(listEl, items);
        countEl.textContent = items.length;
      } catch(e) {
        listEl.innerHTML = `<p class="opm-empty opm-error">Kon opmerkingen niet laden: ${e.message}</p>`;
      }
    }
  });

  // Submit
  submit.addEventListener('click', async () => {
    const naam  = panel.querySelector('.opm-naam').value.trim() || 'Anoniem';
    const tekst = panel.querySelector('.opm-tekst-input').value.trim();
    if (!tekst) return;

    submit.disabled = true;
    submit.textContent = '…';
    feedback.textContent = '';

    try {
      await saveOpmerking(pagina, naam, tekst);
      panel.querySelector('.opm-tekst-input').value = '';
      feedback.style.color = 'var(--green)';
      feedback.textContent = '✓ Opmerking opgeslagen';
      const items = await loadOpmerkingen(pagina);
      renderOpmerkingen(listEl, items);
      countEl.textContent = items.length;
    } catch(e) {
      feedback.style.color = 'var(--red)';
      feedback.textContent = `Fout: ${e.message}`;
    } finally {
      submit.disabled = false;
      submit.textContent = 'Toevoegen';
    }
  });
}

document.addEventListener('DOMContentLoaded', injectOpmerkingPanel);
