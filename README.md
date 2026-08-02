# Signal Tracker

A real-time news and trends feed across tech, food, energy, telecoms, lifestyle,
fashion, sport, and culture. React frontend, hosted free on GitHub Pages, with
a GitHub Actions job that pulls fresh articles every hour. No backend server,
no database — everything lives in this one repo.

This README assumes you've never used GitHub before. Every step is spelled out.

## How it fits together

- **The app** (`src/`) is a React site. It reads `public/data/articles.json`
  and renders it as a card feed, with search, filters, saving, and CSV export.
  Anything you save, dismiss, or configure lives in your browser's
  `localStorage` — nothing is sent anywhere.
- **The scraper** (`scripts/scraper.js`) runs on a schedule inside GitHub
  Actions, not on your computer. It pulls RSS feeds from TechCrunch, Engadget,
  Mashable, and prnewswire, plus anything you add to `sources.json`, and
  writes the results into `public/data/articles.json`.
- **Two workflows** in `.github/workflows/` do the automation:
  - `scrape.yml` runs hourly, scrapes, and commits the updated file.
  - `deploy.yml` runs whenever `main` changes (including that automated
    commit), rebuilds the site, and publishes it to GitHub Pages.

A note on scope: the original plan called for scraping these four sites'
HTML directly with cheerio and axios. All four publish RSS feeds instead, and
RSS is both more reliable (it doesn't break every time a site redesigns) and
more respectful to scrape. So the scraper reads RSS. Cheerio and axios are
still installed if you ever want to add direct HTML scraping for a source
that drops its feed.

**One real limitation to know about up front:** the Settings page lets you
add a source from inside the app, but that only saves it to your own
browser's storage. The scraper runs on GitHub's servers and has no way to
see your browser. To have the hourly scrape actually pick up a new source,
add it to `sources.json` in the repo (steps below) and push — the in-app
form is there for your own reference and for organizing your saved feed by
category, not as a live pipe to the scraper.

## 1. Create your own copy of this repo

1. Go to [github.com](https://github.com) and sign in (or create a free account).
2. Click the **+** icon top-right → **New repository**.
3. Name it `signal-tracker` (or anything you like).
4. Set it to **Public** — GitHub Pages needs this on a free account.
5. Don't add a README, .gitignore, or license on this screen — leave those
   unchecked, since this project already has them.
6. Click **Create repository**. Keep the page open; it'll show you a repo URL
   like `https://github.com/YOUR-USERNAME/signal-tracker.git`.

Now upload this project's files into that repo. The simplest way if you're
new to Git:

1. On your new repo's page, click **uploading an existing file**.
2. Drag in every file and folder from this project (yes, including the
   hidden `.github` folder — if your file browser hides it, check its view
   settings to show hidden files).
3. Scroll down and click **Commit changes**.

If you're comfortable with a terminal, this is faster:

```
cd signal-tracker
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/signal-tracker.git
git push -u origin main
```

## 2. Run it locally (optional, but good for checking changes)

You'll need [Node.js](https://nodejs.org) installed (the LTS version).

```
npm install
npm run dev
```

Open the URL it prints (usually `http://localhost:5173`). You'll see the
sample placeholder articles that ship with the repo — that's expected until
the scraper has run for real.

## 3. Turn on GitHub Pages

1. In your repo, go to **Settings → Pages**.
2. Under **Build and deployment → Source**, choose **GitHub Actions** (not
   "Deploy from a branch" — the `deploy.yml` workflow handles the build
   itself).
3. That's it. The site will publish the first time `deploy.yml` runs (see
   next step).

## 4. Let the workflows run

Workflows are usually on by default, but double-check:

1. Go to the **Actions** tab in your repo.
2. If you see a banner about workflows being disabled, click to enable them.
3. Click into **Build and deploy** on the left, then **Run workflow** to
   trigger the first deploy manually rather than waiting for a push.
4. Click into **Scrape signals** and do the same — **Run workflow** — to
   pull real articles right away instead of waiting for the next hour.

After both finish (a minute or two each), your site is live at:

```
https://YOUR-USERNAME.github.io/signal-tracker/
```

From here, `scrape.yml` runs every hour on its own, and each time it commits
new data, `deploy.yml` rebuilds the site automatically.

## 5. Add your own sources

Open `sources.json` in the repo and add an entry:

```json
{
  "customSources": [
    {
      "id": "my-newsletter",
      "name": "My Newsletter",
      "type": "rss",
      "url": "https://example.com/feed.xml",
      "categories": ["tech"]
    }
  ]
}
```

Commit and push the change (or edit the file directly on GitHub and commit
from there). The next scrape run — automatic within the hour, or triggered
manually from the Actions tab — will pick it up.

## 6. Adjust notification and category defaults

`src/utils/constants.js` has the default categories and per-category
notification frequency caps. Change these before your first deploy if you
want different defaults; anyone using the app can also change their own in
the Settings tab, saved to their own browser.

## Troubleshooting

- **A built-in source shows 0 items in the Actions log.** Some sites block
  automated requests from cloud servers (including GitHub's), even for RSS.
  If `techcrunch.com/feed`, `engadget.com/rss.xml`, `mashable.com/feeds/rss/all`,
  or a prnewswire feed URL starts returning errors, open that URL in your own
  browser to confirm it still exists, then check the Actions log for the
  specific error. You may need to swap in a different feed URL from the same
  site, or remove that source from `scripts/scraper.js`.
- **"Data may be stale" warning on the site.** This means `scrape.yml` hasn't
  written a fresh `articles.json` in over 2 hours. Check the Actions tab for
  failed runs.
- **Site shows the placeholder sample articles forever.** That means
  `deploy.yml` hasn't picked up a real `articles.json` yet — trigger both
  workflows manually once (step 4) to bootstrap it.
- **Changes to `public/data/articles.json` keep getting overwritten.** That
  file is meant to be managed by the scraper, not edited by hand — edits will
  be replaced on the next run.

## Project structure

```
signal-tracker/
├── src/                  React app
│   ├── components/       Feed, Card, SearchBar, FilterPanel, Settings, etc.
│   ├── hooks/             useArticles, useStorage, useNotifications, useSwipe
│   └── utils/             categories, date helpers, CSV export
├── scripts/scraper.js     Node.js scraper (runs inside GitHub Actions)
├── public/data/articles.json   Current feed data (scraper writes here)
├── sources.json           Your custom RSS feeds
└── .github/workflows/      scrape.yml (hourly) + deploy.yml (build & publish)
```
