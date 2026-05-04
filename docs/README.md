# GitHub Pages site

This directory is the source for **https://lucasduys.github.io/cinemorph**.

It is intentionally a hand-rolled static site (HTML + CSS + a few lines of vanilla JS) so it can be served straight off GitHub Pages with no build step. The visual language matches the bundled `stacklink-dark` theme so the site reads as a Cinemorph artifact in its own right.

## Files

```
docs/
├── index.html              # the site
├── styles.css              # Stacklink-dark tokens + component styles
├── script.js               # live morph demo + scroll-aware loop
├── .nojekyll               # opt out of Jekyll processing
└── assets/demos/           # video, gif, storyboards (mirrors top-level /assets/demos)
```

## Enabling GitHub Pages (one-time)

1. Push the `docs/` directory to the default branch.
2. Repo → **Settings** → **Pages**.
3. **Source**: `Deploy from a branch`.
4. **Branch**: `main` (or your default), folder `/docs`.
5. Save. Pages publishes at `https://<owner>.github.io/<repo>/` after a few seconds.

To preview locally without touching Pages:

```bash
cd docs && python3 -m http.server 4000
# → http://localhost:4000
```

Or with `bunx serve`:

```bash
bunx serve docs -l 4000
```

## Updating

Static. Edit `index.html`, `styles.css`, or `script.js` and push. No CI, no build artefacts. If you regenerate the hero film or change the storyboard frames at the repo root (`assets/demos/`), copy them into `docs/assets/demos/` so the published site can serve them.
