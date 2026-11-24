// Reads a club's season page on English Wikipedia and its country on Wikidata, straight from the browser:
// both APIs allow cross-origin requests, so the site needs no server and no stored copies.
const wiki = (() => {
  const WP = 'https://en.wikipedia.org';
  const WD = 'https://www.wikidata.org/w/api.php';
  const cache = new Map();
  const memo = (key, fn) => cache.has(key) ? cache.get(key) : (cache.set(key, fn().catch(e => { cache.delete(key); throw e; })), cache.get(key));
  const json = async url => { const r = await fetch(url); if (!r.ok) throw new Error(`${r.status} ${url}`); return r.json(); };

  // "97/98" -> "1997–98", "05/07" -> "2005–07", "2014" -> "2014"
  const fullSeason = s => s.replace(/^(\d\d)\/(\d\d)$/, (_, a, b) => (a < 30 ? '20' : '19') + a + '–' + b);

  async function findSeasonPage(team, season) {
    const q = `${team} ${fullSeason(season)} season`;
    const d = await json(`${WP}/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(q)}&srlimit=5&format=json&origin=*`);
    const year = fullSeason(season).slice(0, 4);
    const hit = d.query.search.find(r => /season$/.test(r.title) && r.title.includes(year) && r.title.toLowerCase().includes(team.toLowerCase().split(' ')[0]));
    return hit ? hit.title : null;
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
        const num = heads.indexOf('No.'), player = heads.indexOf('Player');
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

  return { fullSeason, findSeasonPage, seasonInfo, country };
})();
