// Reads a club's season page on English Wikipedia and its country on Wikidata, straight from the browser:
// both APIs allow cross-origin requests, so the site needs no server and no stored copies.
const wiki = (() => {
  const WP = 'https://en.wikipedia.org';
  const WD = 'https://www.wikidata.org/w/api.php';
  // Results live in memory for the visit and in localStorage for 30 days, so a season page is fetched once per browser.
  const cache = new Map();
  const TTL = 30 * 24 * 3600 * 1000;
  const stored = key => { try { const v = JSON.parse(localStorage.getItem('wiki:' + key)); return v && Date.now() - v.t < TTL ? v.v : undefined; } catch { return undefined; } };
  const store = (key, v) => { try { localStorage.setItem('wiki:' + key, JSON.stringify({ t: Date.now(), v })); } catch { /* full or blocked: live without it */ } };
  function memo(key, fn) {
    if (cache.has(key)) return cache.get(key);
    const hit = stored(key);
    const p = hit !== undefined ? Promise.resolve(hit) : fn().then(v => (store(key, v), v)).catch(e => { cache.delete(key); throw e; });
    cache.set(key, p);
    return p;
  }
  const json = async url => { const r = await fetch(url); if (!r.ok) throw new Error(`${r.status} ${url}`); return r.json(); };

  // "1997-98" -> "1997–98" (Wikipedia's dash), "2014" -> "2014"
  const fullSeason = s => s.replace(/^(\d{4})-(\d\d)$/, '$1–$2');

  function findSeasonPage(team, season) {
    return memo(`page:${team}:${season}`, async () => {
    const q = `${team} ${fullSeason(season)} season`;
    const d = await json(`${WP}/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(q)}&srlimit=5&format=json&origin=*`);
    const year = fullSeason(season).slice(0, 4);
    const hit = d.query.search.find(r => /season$/.test(r.title) && r.title.includes(year) && r.title.toLowerCase().includes(team.toLowerCase().split(' ')[0]));
    return hit ? hit.title : null;
    });
  }

  const text = el => el.textContent.replace(/\[\d+\]/g, '').replace(/\s+/g, ' ').trim();

  // {title, url, competitions: [{name, result}], topScorer, squad: {number: name}, kits: {home: html, away: html, ...}}
  // kits are the infobox's layered drawings from Wikimedia Commons: the 100×135 px block above each "… colours" label
  function seasonInfo(title) {
    return memo('season:' + title, async () => {
      const r = await fetch(`${WP}/api/rest_v1/page/html/${encodeURIComponent(title.replace(/ /g, '_'))}`);
      if (!r.ok) throw new Error(`${r.status} ${title}`);
      const doc = new DOMParser().parseFromString(await r.text(), 'text/html');
      doc.querySelectorAll('br').forEach(b => b.replaceWith(' '));
      const info = { title, url: `${WP}/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`, competitions: [], topScorer: '', squad: {}, kits: {} };
      const skip = /chairman|owner|president|manager|coach|stadium|attendance|colours|biggest|prev|next|←|→/i;
      for (const row of doc.querySelectorAll('table.infobox tr')) {
        const th = row.querySelector('th'), td = row.querySelector('td');
        if (!th || !td) continue;
        const name = text(th), result = text(td);
        if (/top goalscorer/i.test(name)) info.topScorer = result;
        else if (!skip.test(name) && result) info.competitions.push({ name, result });
      }
      for (const label of doc.querySelectorAll('table.infobox td')) {
        const m = text(label).match(/^(\w+) colours$/i);
        if (!m) continue;
        // the drawing sits in the label's own cell, or in the cell above it on older pages
        const row = label.parentElement, i = [...row.children].indexOf(label);
        const block = (label.querySelector('div[style*="height: 135px"]') || row.previousElementSibling?.children[i])?.closest?.('td')?.querySelector('div[style*="height: 135px"]');
        if (block) info.kits[m[1].toLowerCase()] = block.outerHTML.replace(/(="|, )\/\//g, '$1https://');
      }
      for (const table of doc.querySelectorAll('table')) {
        const heads = [...table.querySelectorAll('th')].map(text);
        const num = heads.indexOf('No.'), player = heads.indexOf('Player') >= 0 ? heads.indexOf('Player') : heads.indexOf('Name');
        if (num < 0 || player < 0) continue;
        for (const row of table.querySelectorAll('tr')) {
          const cells = row.querySelectorAll('td');
          if (cells.length <= player) continue;
          const n = text(cells[num]).replace(/\D/g, ''), name = text(cells[player]).replace(/\s*\(.*\)$/, '');
          if (n && name && !info.squad[n]) info.squad[n] = name;
        }
      }
      return info;
    });
  }

  // The country a club or national team plays for: Wikidata's "country for sport", else "country".
  function country(team) {
    return memo('country:' + team, async () => {
      const s = await json(`${WD}?action=wbsearchentities&search=${encodeURIComponent(team)}&language=en&type=item&limit=1&format=json&origin=*`);
      const id = s.search[0]?.id;
      if (!id) return '';
      const e = await json(`${WD}?action=wbgetentities&ids=${id}&props=claims&format=json&origin=*`);
      const first = (claims, p) => claims[p]?.[0]?.mainsnak.datavalue?.value.id;
      let claims = e.entities[id].claims;
      let cid = first(claims, 'P1532'), leagueName = '';
      // a club has no sporting country of its own: take its league's, so an English club is England, not the UK
      if (!cid && first(claims, 'P118')) {
        const league = first(claims, 'P118');
        const le = await json(`${WD}?action=wbgetentities&ids=${league}&props=claims|labels&languages=en&format=json&origin=*`);
        cid = first(le.entities[league].claims, 'P1532') || first(le.entities[league].claims, 'P17');
        leagueName = le.entities[league].labels.en?.value || '';
      }
      cid = cid || first(claims, 'P17');
      if (!cid) return '';
      const l = await json(`${WD}?action=wbgetentities&ids=${cid}&props=labels&languages=en&format=json&origin=*`);
      const name = l.entities[cid].labels.en?.value || '';
      // shortcut: Wikidata knows UK clubs only as United Kingdom; the league's name tells the home nation
      if (name === 'United Kingdom') return /scottish/i.test(leagueName) ? 'Scotland' : /welsh|cymru/i.test(leagueName) ? 'Wales' : /irish|northern ireland/i.test(leagueName) ? 'Northern Ireland' : 'England';
      return name;
    });
  }

  // The kit maker of a club in a season, from the "Personnel and kits" table of the league's season page; '' when unknown.
  function kitMaker(league, season, team) {
    return memo(`maker:${league}:${season}:${team}`, async () => {
      const q = `${fullSeason(season)} ${league}`;
      const d = await json(`${WP}/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(q)}&srlimit=5&format=json&origin=*`);
      const hit = d.query.search.find(r => r.title.startsWith(fullSeason(season)));
      if (!hit) return '';
      const r = await fetch(`${WP}/api/rest_v1/page/html/${encodeURIComponent(hit.title.replace(/ /g, '_'))}`);
      if (!r.ok) return '';
      const doc = new DOMParser().parseFromString(await r.text(), 'text/html');
      const want = team.toLowerCase();
      for (const table of doc.querySelectorAll('table')) {
        const heads = [...table.querySelectorAll('tr:first-child th')].map(text);
        const club = heads.findIndex(h => /^(team|club)$/i.test(h)), maker = heads.findIndex(h => /kit (manufacturer|maker|supplier)/i.test(h));
        if (club < 0 || maker < 0) continue;
        for (const row of table.querySelectorAll('tr')) {
          const cells = row.querySelectorAll('td');
          if (cells.length <= maker) continue;
          const name = text(cells[club]).toLowerCase();
          if (name && (name.includes(want) || want.includes(name))) return text(cells[maker]).replace(/\s*\(.*\)$/, '');
        }
      }
      return '';
    });
  }

  return { fullSeason, findSeasonPage, seasonInfo, country, kitMaker };
})();
