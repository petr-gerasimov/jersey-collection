# Eleven Jersey

A static site listing my football jerseys. Type a club or national team and a season to see the kits,
the season's results from Wikipedia, and a link to all kits of that season on Football Kit Archive.

- `index.html` — the collection in sections per team, most kits first, newest season first; a card opens the kit's details. A card
  without a photo shows Wikipedia's drawing of that kit from the club's season page. No build step.
- `style.css` — the look, in the logo's cream and green. `logo.png`, `favicon.png`, `favicon-32.png` — the brand.
- `add.html` — the form that adds a kit. Country and brand are filled from the collection, a new club's
  country from Wikidata, the player from the squad on the club's Wikipedia season page. Required: club,
  season, kit, status. It saves straight to this repository through the GitHub API with a fine-grained
  token (Contents: read and write) kept in the browser's local storage; without a token it shows the
  JSON to paste by hand.
- `wiki.js` — the Wikipedia and Wikidata lookups, called from the browser (both APIs allow it); results are
  kept in the browser's local storage for 30 days, so a season page is fetched once.
- `kits.json` — the collection, one object per kit: `status` (`yes` owned, `bought` on its way,
  `wishlist`), `team`, `country`, `season` (`2023-24` for an autumn–spring league, `2024` for a national
  team or a spring–autumn league), `kit` (`home`, `away`, `third`, `fourth`, `special`, `training`,
  `goalkeeper`), `brand`, `version` (`player issue`, `replica`, `match worn`, `match issued`, `retro`,
  `unofficial`), `size` (`Kids`, `XS`…`XXL`), `number`, `player`, `description`, `comment`, `link`,
  `photo` (file in `photos/`). Empty fields are left out.
- `teams.json` — the clubs of the top ten UEFA leagues (England five tiers, Germany three, the rest two)
  from the 2025–26 season pages on Wikipedia, and the 211 FIFA member national teams. It feeds the form's
  team and country lists; rebuild it from the same pages when a season changes the line-ups.
- `photos/` — kit photos, keep each under ~200 KB.

GitHub Pages serves `main`; a saved kit is on the site about a minute later.
