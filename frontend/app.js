// Tree Hierarchy Analyzer — app.js

// ── Config ────────────────────────────────────────────────────────────────────
// Point this at your deployed backend (no trailing slash, no /bfhl)
const API_BASE = 'https://kapilnath-bfhl-api.onrender.com';

const SAMPLE = [
  'A->B', 'A->C', 'B->D', 'C->E', 'E->F',
  'X->Y', 'Y->Z', 'Z->X',
  'P->Q', 'Q->R',
  'G->H', 'G->H', 'G->I',
  'hello', '1->2', 'A->',
].join(', ');

// ── DOM ───────────────────────────────────────────────────────────────────────
const inputEl      = document.getElementById('node-input');
const submitBtn    = document.getElementById('submit-btn');
const clearBtn     = document.getElementById('clear-btn');
const sampleBtn    = document.getElementById('load-example-btn');
const errorBox     = document.getElementById('error-box');
const errorMsg     = document.getElementById('error-msg');
const statsRow     = document.getElementById('stats-row');
const hierSection  = document.getElementById('hier-section');
const hierGrid     = document.getElementById('hier-grid');
const chipsSection = document.getElementById('chips-section');
const invalidList  = document.getElementById('invalid-list');
const dupList      = document.getElementById('dup-list');

const sTrees   = document.getElementById('s-trees');
const sCycles  = document.getElementById('s-cycles');
const sRoot    = document.getElementById('s-root');
const sInvalid = document.getElementById('s-invalid');

// ── Parse ─────────────────────────────────────────────────────────────────────
function parseEdges(raw) {
  return raw.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
}

// ── Loading state ─────────────────────────────────────────────────────────────
function setLoading(on) {
  submitBtn.classList.toggle('loading', on);
  submitBtn.disabled = on;
  clearBtn.disabled  = on;
}

// ── Error display ─────────────────────────────────────────────────────────────
function showError(msg) {
  errorMsg.textContent = msg;
  errorBox.classList.remove('hidden');
}
function hideError() {
  errorBox.classList.add('hidden');
}

// ── Build tree DOM ────────────────────────────────────────────────────────────
function buildTreeUl(obj, depth) {
  const ul = document.createElement('ul');
  ul.className = 'tree-ul' + (depth > 0 ? ' nested' : '');

  for (const [name, kids] of Object.entries(obj)) {
    const li  = document.createElement('li');
    li.className = `tree-li d${Math.min(depth, 4)}`;

    const lbl = document.createElement('span');
    lbl.className = 'tree-lbl';

    const dot = document.createElement('span');
    dot.className = 'tree-dot';
    dot.setAttribute('aria-hidden', 'true');

    const nm = document.createElement('span');
    nm.className = 'tree-name';
    nm.textContent = name;

    lbl.appendChild(dot);
    lbl.appendChild(nm);
    li.appendChild(lbl);

    if (kids && Object.keys(kids).length > 0) {
      li.appendChild(buildTreeUl(kids, depth + 1));
    }
    ul.appendChild(li);
  }
  return ul;
}

// ── Build hierarchy card ──────────────────────────────────────────────────────
function buildCard(h, idx) {
  const isCycle = !!h.has_cycle;

  const card = document.createElement('div');
  card.className = 'hcard' + (isCycle ? ' is-cycle' : '');
  card.style.animationDelay = `${idx * 50}ms`;

  // --- top bar ---
  const top = document.createElement('div');
  top.className = 'hcard-top';

  const left = document.createElement('div');
  left.className = 'hcard-left';

  const circle = document.createElement('div');
  circle.className = 'root-circle';
  circle.textContent = h.root;

  const info = document.createElement('div');
  info.className = 'hcard-info';
  info.innerHTML = `<div class="hcard-label">${isCycle ? 'Cycle' : 'Root'}</div><div class="hcard-root-name">${h.root}</div>`;

  left.appendChild(circle);
  left.appendChild(info);

  const badges = document.createElement('div');
  badges.className = 'hcard-badges';

  if (isCycle) {
    const b = document.createElement('span');
    b.className = 'badge badge-cycle';
    b.textContent = '⟳ Cycle';
    badges.appendChild(b);
  } else {
    const b = document.createElement('span');
    b.className = 'badge badge-depth';
    b.textContent = `Depth ${h.depth}`;
    badges.appendChild(b);
  }

  top.appendChild(left);
  top.appendChild(badges);

  // --- body ---
  const body = document.createElement('div');
  body.className = 'hcard-body';

  if (isCycle) {
    body.innerHTML = `
      <div class="cycle-notice">
        <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
        </svg>
        Circular dependency — no acyclic tree can be constructed.
      </div>`;
  } else if (h.tree && Object.keys(h.tree).length > 0) {
    const wrap = document.createElement('div');
    wrap.className = 'tree-wrap';
    wrap.appendChild(buildTreeUl(h.tree, 0));
    body.appendChild(wrap);
  } else {
    body.innerHTML = '<p style="font-size:.82rem;color:var(--text-4)">Empty tree.</p>';
  }

  card.appendChild(top);
  card.appendChild(body);
  return card;
}

// ── Render chips ──────────────────────────────────────────────────────────────
function renderChips(container, items, cls) {
  container.innerHTML = '';
  if (!items || items.length === 0) {
    const n = document.createElement('span');
    n.className = 'empty-note';
    n.textContent = 'None';
    container.appendChild(n);
    return;
  }
  items.forEach((text, i) => {
    const c = document.createElement('span');
    c.className = `chip ${cls}`;
    c.style.animationDelay = `${i * 30}ms`;
    c.textContent = text;
    container.appendChild(c);
  });
}

// ── Render full response ──────────────────────────────────────────────────────
function renderResult(data) {
  // stats
  sTrees.textContent   = data.summary.total_trees;
  sCycles.textContent  = data.summary.total_cycles;
  sRoot.textContent    = data.summary.largest_tree_root || '—';
  sInvalid.textContent = (data.invalid_entries || []).length;
  statsRow.classList.remove('hidden');

  // hierarchies
  hierGrid.innerHTML = '';
  const hiers = data.hierarchies || [];
  if (hiers.length) {
    hiers.forEach((h, i) => hierGrid.appendChild(buildCard(h, i)));
    hierSection.classList.remove('hidden');
  } else {
    hierSection.classList.add('hidden');
  }

  // chips
  renderChips(invalidList, data.invalid_entries || [], 'chip-invalid');
  renderChips(dupList, data.duplicate_edges || [], 'chip-dup');
  chipsSection.classList.remove('hidden');

  statsRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ── Submit ────────────────────────────────────────────────────────────────────
async function submit() {
  const raw = inputEl.value.trim();
  if (!raw) { showError('Please enter at least one edge before submitting.'); return; }

  hideError();
  setLoading(true);

  try {
    const res = await fetch(`${API_BASE}/bfhl`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: parseEdges(raw) }),
    });

    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new Error(e.error || `HTTP ${res.status}`);
    }

    renderResult(await res.json());
  } catch (err) {
    showError(`Request failed: ${err.message}`);
  } finally {
    setLoading(false);
  }
}

// ── Events ────────────────────────────────────────────────────────────────────
submitBtn.addEventListener('click', submit);

inputEl.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); submit(); }
});

inputEl.addEventListener('input', () => {
  clearBtn.disabled = inputEl.value.trim() === '';
});

clearBtn.addEventListener('click', () => {
  inputEl.value = '';
  clearBtn.disabled = true;
  hideError();
  statsRow.classList.add('hidden');
  hierSection.classList.add('hidden');
  chipsSection.classList.add('hidden');
  hierGrid.innerHTML = '';
});

sampleBtn.addEventListener('click', () => {
  inputEl.value = SAMPLE;
  clearBtn.disabled = false;
  inputEl.focus();
});
