# Eleven Jersey

A static site listing my football jerseys. Type a club or national team and a season to see the kits,
the season's results from Wikipedia, and a link to all kits of that season on Football Kit Archive.

- `index.html` — the collection: search form, kit cards, season block; a card opens the kit's details. A card
  without a photo shows Wikipedia's drawing of that kit from the club's season page. No build step.
- `style.css` — the look, in the logo's cream and green. `logo.png`, `favicon.png`, `favicon-32.png` — the brand.
- `add.html` — the form that adds a kit. Country and brand are filled from the collection, a new club's
  country from Wikidata, the player from the squad on the club's Wikipedia season page. Required: club,
  season, kit, status. It saves straight to this repository through the GitHub API with a fine-grained
  token (Contents: read and write) kept in the browser's local storage; without a token it shows the
  JSON to paste by hand.
- `wiki.js` — the Wikipedia and Wikidata lookups, called from the browser (both APIs allow it).
- `kits.json` — the collection, one object per kit: `status` (`yes` owned, `bought` on its way,
  `wishlist`), `team`, `country`, `season` (`25/26` or `2014`), `kit` (`home`, `away`, `third`, `fourth`,
  `special`, `training`, `goalkeeper`), `brand`, `version` (`authentic`, `fan`, `replica`), `size`,
  `number`, `player`, `description`, `comment`, `link`, `photo` (file in `photos/`). Empty fields are left out.
- `photos/` — kit photos, keep each under ~200 KB.

GitHub Pages serves `main`; a saved kit is on the site about a minute later.
