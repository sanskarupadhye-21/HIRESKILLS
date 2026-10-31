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

  document.body.classList.remove('has-sidebar');
  const currentActive = active || 'dashboard';

  el.innerHTML = `
    <div class="dock-wrap" style="position:fixed; top:20px; left:0; right:0; z-index:9999; display:flex; justify-content:center; pointer-events:none;">
      <nav class="dock par-dock" style="pointer-events:auto; display:flex; align-items:center; gap:4px; height:50px; padding:6px; border-radius:18px; border:1px solid rgba(255,255,255,.14); background:linear-gradient(180deg, rgba(255,255,255,.08), rgba(255,255,255,0) 42%), rgba(30,36,28,.88); box-shadow:0 14px 34px rgba(10,14,8,.45), inset 0 1px rgba(255,255,255,.09); backdrop-filter:blur(24px) saturate(180%); -webkit-backdrop-filter:blur(24px) saturate(180%);" data-spec aria-label="HireSkill AI Global Navigation">
        <a class="dock-item dock-mark" data-dock data-spec href="/" style="width:38px; height:38px; padding:0; display:flex; align-items:center; justify-content:center; border-radius:12px; background:#eef1e7; color:#23261f; text-decoration:none;" aria-label="HireSkill AI Home">
          <svg viewBox="0 0 22 24" style="width:20px; height:20px; fill:currentColor;" aria-hidden="true">
            <path d="M11 1.3c-2.1 0-3.95 1.2-4.75 2.95C3.95 4.55 2.3 6.25 2.3 8.35c0 2.3 1.9 4.2 4.3 4.2h8.8c2.4 0 4.3-1.9 4.3-4.2 0-2.1-1.65-3.8-4-4.1C14.95 2.5 13.1 1.3 11 1.3Z"/>
            <path d="M9.6 12.55h2.8v4.2c1.35.3 2.45 1.15 3.15 2.4-1.35.4-2.4.15-3.15-.4v4.15H9.6v-4.15c-.75.55-1.8.8-3.15.4.7-1.25 1.8-2.1 3.15-2.4v-4.2Z"/>
          </svg>
        </a>

        <a class="dock-item ${currentActive === 'dashboard' ? 'is-active' : ''}" data-dock data-spec href="/dashboard" style="height:38px; padding:0 14px; display:inline-flex; align-items:center; gap:8px; border-radius:12px; text-decoration:none; font-size:12px; font-weight:500; letter-spacing:1px; text-transform:uppercase; color:${currentActive === 'dashboard' ? '#23261f' : 'rgba(255,255,255,.7)'}; background:${currentActive === 'dashboard' ? '#f2f3ef' : 'rgba(255,255,255,.05)'}; transition:all .2s;">
          <span>⊞</span><span>Dashboard</span>
        </a>

        <a class="dock-item ${currentActive === 'resume' ? 'is-active' : ''}" data-dock data-spec href="/resume" style="height:38px; padding:0 14px; display:inline-flex; align-items:center; gap:8px; border-radius:12px; text-decoration:none; font-size:12px; font-weight:500; letter-spacing:1px; text-transform:uppercase; color:${currentActive === 'resume' ? '#23261f' : 'rgba(255,255,255,.7)'}; background:${currentActive === 'resume' ? '#f2f3ef' : 'rgba(255,255,255,.05)'}; transition:all .2s;">
          <span>📄</span><span>Resume</span>
        </a>

        <a class="dock-item ${currentActive === 'interview' ? 'is-active' : ''}" data-dock data-spec href="/interview" style="height:38px; padding:0 14px; display:inline-flex; align-items:center; gap:8px; border-radius:12px; text-decoration:none; font-size:12px; font-weight:500; letter-spacing:1px; text-transform:uppercase; color:${currentActive === 'interview' ? '#23261f' : 'rgba(255,255,255,.7)'}; background:${currentActive === 'interview' ? '#f2f3ef' : 'rgba(255,255,255,.05)'}; transition:all .2s;">
          <span>🎙️</span><span>Studio</span>
        </a>

        <a class="dock-item ${currentActive === 'report' ? 'is-active' : ''}" data-dock data-spec href="/report" style="height:38px; padding:0 14px; display:inline-flex; align-items:center; gap:8px; border-radius:12px; text-decoration:none; font-size:12px; font-weight:500; letter-spacing:1px; text-transform:uppercase; color:${currentActive === 'report' ? '#23261f' : 'rgba(255,255,255,.7)'}; background:${currentActive === 'report' ? '#f2f3ef' : 'rgba(255,255,255,.05)'}; transition:all .2s;">
          <span>📊</span><span>Scorecards</span>
        </a>

        <a class="dock-item ${currentActive === 'profile' ? 'is-active' : ''}" data-dock data-spec href="/profile" style="height:38px; padding:0 14px; display:inline-flex; align-items:center; gap:8px; border-radius:12px; text-decoration:none; font-size:12px; font-weight:500; letter-spacing:1px; text-transform:uppercase; color:${currentActive === 'profile' ? '#23261f' : 'rgba(255,255,255,.7)'}; background:${currentActive === 'profile' ? '#f2f3ef' : 'rgba(255,255,255,.05)'}; transition:all .2s;">
          <span>👤</span><span>Profile</span>
        </a>

        ${user ? `
          <button class="dock-item dock-item--enter" id="logout-btn" type="button" style="height:38px; padding:0 14px; border:1px solid rgba(255,255,255,.14); border-radius:12px; background:rgba(255,255,255,.08); color:#fff; font-size:12px; font-weight:500; letter-spacing:1px; text-transform:uppercase; cursor:pointer;">
            <span>Log out</span>
          </button>
        ` : `
          <a class="dock-item dock-item--enter" href="/" style="height:38px; padding:0 14px; border:1px solid rgba(255,255,255,.14); border-radius:12px; background:rgba(255,255,255,.08); color:#fff; font-size:12px; font-weight:500; letter-spacing:1px; text-transform:uppercase; text-decoration:none;">
            <span>Sign In</span>
          </a>
        `}
      </nav>
    </div>
  `;

  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      clearSession();
      window.location.href = '/';
    });
  }

  // Initialize specular rim effect on dock if available
  if (window.initSpecularDock) {
    window.initSpecularDock();
  }
}

function scoreColor(score) {
  if (score >= 75) return '#30D158'; // Apple System Mint Green
  if (score >= 50) return '#FF9F0A'; // Apple System Orange
  return '#FF453A';                 // Apple System Red
}

function ringSVG(score, size = 120, stroke = 10, label = 'SCORE') {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(100, Math.max(0, score)) / 100) * c;
  const color = scoreColor(score);
  const gradId = `ring-grad-${Math.floor(Math.random() * 100000)}`;

  return `
    <div class="ring-wrap" style="width:${size}px;height:${size}px;">
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        <defs>
          <linearGradient id="${gradId}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="${color}" />
            <stop offset="100%" stop-color="${score >= 75 ? '#64D2FF' : score >= 50 ? '#FFD60A' : '#FF375F'}" />
          </linearGradient>
        </defs>
        <circle class="ring-bg" cx="${size / 2}" cy="${size / 2}" r="${r}"></circle>
        <circle class="ring-fg" cx="${size / 2}" cy="${size / 2}" r="${r}"
          style="stroke:url(#${gradId}); stroke-dasharray:${c}; stroke-dashoffset:${offset};"></circle>
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
