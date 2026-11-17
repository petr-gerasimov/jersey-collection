# Jersey Collection

A static site listing my football jerseys. Type a club or national team and a season to see the kits.

- `index.html` — the page: search form and kit cards, no build step.
- `kits.json` — the collection, one object per kit, the columns of the spreadsheet it came from: `status` (`yes` owned, `bought` on its way, `wishlist`), `team`, `country`, `season` (`25/26` or `2014`), `kit` (`home`, `away`, `third`, `special`, `training`, `goalkeeper`), `brand`, `size`, `comment`, and `photo` (file in `photos/`, optional). Empty fields are left out.
- `photos/` — kit photos, keep each under ~200 KB.

To add a kit: append an object to `kits.json`, put its photo in `photos/`, commit, push. GitHub Pages serves `main`.
