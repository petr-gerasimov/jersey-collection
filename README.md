# Jersey Collection

A static site listing my football jerseys. Type a club or national team and a season to see the kits.

- `index.html` — the page: search form and kit cards, no build step.
- `kits.json` — the collection, one object per kit: `team`, `season` (`2003/04`), `kit` (`home`, `away`, `third`, ...), `photo` (file in `photos/`), `owned`.
- `photos/` — kit photos, keep each under ~200 KB.

To add a kit: append an object to `kits.json`, put its photo in `photos/`, commit, push. GitHub Pages serves `main`.
