const API_BASE = '/api';
const THEME_KEY = 'hsa_theme';
const GUEST_USER = { id: 'guest', name: 'Guest User', email: 'guest@example.com' };

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
}

applyTheme(localStorage.getItem(THEME_KEY) || 'dark');

function getToken() {
  return localStorage.getItem('hg_token');
}
function getUser() {
  const raw = localStorage.getItem('hg_user');
  return raw ? JSON.parse(raw) : null;
}
function setSession(token, user) {
  localStorage.setItem('hg_token', token);
  localStorage.setItem('hg_user', JSON.stringify(user));
}
function clearSession() {
  localStorage.removeItem('hg_token');
  localStorage.removeItem('hg_user');
}
function ensureGuestSession() {
  setSession('guest-token', GUEST_USER);
}
function requireAuth() {
  const token = getToken();
  if (!token || token === 'guest-token') {
    ensureGuestSession();
  }
}

async function api(path, { method = 'GET', body, auth = true } = {}, retry = false) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && !retry && getToken() && getToken() !== 'guest-token') {
      clearSession();
      ensureGuestSession();
      return api(path, { method, body, auth }, true);
    }
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

async function apiUpload(path, formData, retry = false) {
  const headers = {};
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { method: 'POST', headers, body: formData });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && !retry && getToken() && getToken() !== 'guest-token') {
      clearSession();
      ensureGuestSession();
      return apiUpload(path, formData, true);
    }
    throw new Error(data.error || `Upload failed (${res.status})`);
  }
  return data;
}

function renderNav(active) {
  const user = getUser();
  const el = document.getElementById('nav-root');
  if (!el) return;

  document.body.classList.add('has-sidebar');
  const currentActive = active || 'dashboard';
  const homeHref = user ? '/dashboard.html' : '/index.html';

  el.innerHTML = `
    <aside class="sidebar">
      <a href="${homeHref}" class="brand" style="text-decoration:none;" aria-label="HireSkill AI home" title="HireSkill AI">
        <span class="brand-mark" aria-hidden="true">HS</span>
        <span>
          <span class="brand-title">HireSkill AI</span>
          <span class="brand-subtitle">Student Success Hub</span>
        </span>
      </a>

      <div class="sidebar-card">
        <p class="eyebrow">Workspace</p>
        <h3>${user ? user.name : 'Guest learner'}</h3>
        <p>Practice interviews with AI-guided feedback and polished, professional reporting.</p>
      </div>

      ${user ? `
      <nav class="sidebar-nav">
        <a href="/dashboard.html" class="sidebar-link ${currentActive === 'dashboard' ? 'active' : ''}">
          <span>◉</span> Dashboard
        </a>
        <a href="/profile.html" class="sidebar-link ${currentActive === 'profile' ? 'active' : ''}">
          <span>◉</span> Profile
        </a>
        <a href="/resume.html" class="sidebar-link ${currentActive === 'resume' ? 'active' : ''}">
          <span>◉</span> Resume insights
        </a>
        <a href="/interview.html" class="sidebar-link ${currentActive === 'interview' ? 'active' : ''}">
          <span>◉</span> Live interview
        </a>
        <a href="/report.html" class="sidebar-link ${currentActive === 'report' ? 'active' : ''}">
          <span>◉</span> Reports
        </a>
      </nav>` : ''}

      <div class="sidebar-footer">
        <button class="btn btn-secondary theme-toggle" id="theme-toggle" type="button" aria-pressed="${document.documentElement.dataset.theme === 'light'}">
          <span aria-hidden="true">${document.documentElement.dataset.theme === 'light' ? '☾' : '☀'}</span>
          ${document.documentElement.dataset.theme === 'light' ? 'Dark mode' : 'Light mode'}
        </button>
        ${user ? `<button class="btn btn-secondary" id="logout-btn">Log out</button>` : `<a class="btn btn-primary" href="/index.html">Join now</a>`}
      </div>
    </aside>
  `;

  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const nextTheme = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
      localStorage.setItem(THEME_KEY, nextTheme);
      applyTheme(nextTheme);
      renderNav(active);
    });
  }

  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      clearSession();
      window.location.href = '/index.html';
    });
  }
}

function scoreColor(score) {
  if (score >= 75) return '#2dd4bf';
  if (score >= 50) return '#f5c451';
  return '#fb7156';
}

function ringSVG(score, size = 120, stroke = 10, label = 'SCORE') {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(100, Math.max(0, score)) / 100) * c;
  const color = scoreColor(score);
  return `
    <div class="ring-wrap" style="width:${size}px;height:${size}px;">
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        <circle class="ring-bg" cx="${size / 2}" cy="${size / 2}" r="${r}"></circle>
        <circle class="ring-fg" cx="${size / 2}" cy="${size / 2}" r="${r}"
          style="stroke:${color}; stroke-dasharray:${c}; stroke-dashoffset:${offset};"></circle>
      </svg>
      <div class="ring-label">
        <span class="num">${Math.round(score)}</span>
        <span class="unit">${label}</span>
      </div>
    </div>
  `;
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
