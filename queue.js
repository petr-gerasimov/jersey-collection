// New kits wait in this browser's storage and show on the site at once; Sync sends them to the repository in one commit.
const queue = (() => {
  const REPO = 'petr-gerasimov/jersey-collection';
  const read = k => { try { return JSON.parse(localStorage.getItem(k)) || []; } catch { return []; } };
  const write = (k, v) => localStorage.setItem(k, JSON.stringify(v));
  const pending = () => read('pending'), synced = () => read('synced');

  function add(kit, photoData) {
    const item = { ...kit, id: Date.now().toString(36) };
    if (photoData) item.photoData = photoData;
    write('pending', [...pending(), item]);
    return item;
  }

  // Kits to show on top of kits.json: the waiting ones, and synced ones that GitHub Pages has not published yet.
  function extra(published) {
    const ids = new Set(published.map(k => k.id));
    const keep = synced().filter(k => !ids.has(k.id));
    if (keep.length !== synced().length) write('synced', keep);
    return [...keep, ...pending()];
  }

  const token = () => localStorage.getItem('gh_token');
  const forget = () => localStorage.removeItem('gh_token');
  const b64 = bytes => btoa(String.fromCharCode(...bytes));
  const utf8 = s => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\n/g, '')), c => c.charCodeAt(0)));
  async function gh(path, opts = {}) {
    const r = await fetch(`https://api.github.com/repos/${REPO}/contents/${path}`, {
      ...opts, headers: { Authorization: `Bearer ${token()}`, Accept: 'application/vnd.github+json', ...(opts.headers || {}) } });
    if (!r.ok) throw new Error(`GitHub ${r.status} on ${path}: ${(await r.json()).message || ''}`);
    return r.json();
  }

  async function sync() {
    const items = pending();
    if (!items.length) return 0;
    if (!token()) {
      const t = prompt('GitHub token with write access to the repository (fine-grained, Contents: read and write). It stays in this browser only.');
      if (!t) throw new Error('no token');
      localStorage.setItem('gh_token', t.trim());
    }
    for (const k of items) if (k.photoData)
      await gh(`photos/${k.photo}`, { method: 'PUT', body: JSON.stringify({ message: `Photo: ${k.team} ${k.season} ${k.kit}`, content: k.photoData.split(',')[1] }) });
    const cur = await gh('kits.json', { headers: { 'If-None-Match': '' } });
    const all = JSON.parse(utf8(cur.content));
    const clean = items.map(({ photoData, ...k }) => k);
    all.push(...clean);
    const body = new TextEncoder().encode(JSON.stringify(all, null, 1));
    await gh('kits.json', { method: 'PUT', body: JSON.stringify({ message: `Add ${clean.map(k => `${k.team} ${k.season} ${k.kit}`).join(', ')}`, content: b64(body), sha: cur.sha }) });
    write('synced', [...synced(), ...items]);
    write('pending', []);
    return clean.length;
  }

  // The header's Sync button: shown with the count while something waits; `done` runs after a sync.
  function button(el, done) {
    const show = () => { const n = pending().length; el.hidden = !n; el.textContent = `Sync ${n}`; el.disabled = false; };
    el.addEventListener('click', async () => {
      el.disabled = true; el.textContent = 'Syncing…';
      try { const n = await sync(); el.textContent = `Synced ${n}`; setTimeout(show, 2000); done?.(); }
      catch (e) { show(); if (e.message !== 'no token') alert('Not synced. ' + e.message); }
    });
    show();
    return show;
  }

  return { add, pending, extra, sync, token, forget, button };
})();
