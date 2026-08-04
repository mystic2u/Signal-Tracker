/**
 * Signal Tracker scraper.
 *
 * Design note: the original brief called for cheerio + axios HTML scraping
 * of TechCrunch, prnewswire, Mashable, and Engadget. All four publish RSS
 * feeds, and the brief itself says to prefer RSS over HTML scraping when
 * it's available — so that's what this script does. RSS is far less likely
 * to break silently every time a site redesigns its markup, and it's the
 * more respectful way to pull from these sites. Raw HTML scraping (cheerio
 * + axios, both still listed as dependencies) is left as a fallback you can
 * fill in under `scrapeHtmlFallback` for any source that drops its feed.
 *
 * Every run:
 *   1. Reads the built-in sources below plus anything in sources.json.
 *   2. Fetches each feed, maps entries to the app's article shape.
 *   3. Merges with the existing public/data/articles.json, de-duplicated
 *      by id, newest 500 kept.
 *   4. Writes the result back out with a fresh generatedAt timestamp.
 */

import Parser from 'rss-parser';
import { readFile, writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DATA_PATH = path.join(ROOT, 'public', 'data', 'articles.json');
const SOURCES_PATH = path.join(ROOT, 'sources.json');

const MAX_ARTICLES = 500;
const REQUEST_DELAY_MS = 1500;

// Built-in sources named in the brief. Swap or add feed URLs here as sites
// change theirs — check each site's own /feed or "RSS" footer link if one
// of these starts returning nothing.
const BUILT_IN_SOURCES = [
  { name: 'TechCrunch', url: 'https://techcrunch.com/feed/', categories: ['tech'] },
  { name: 'Engadget', url: 'https://www.engadget.com/rss.xml', categories: ['tech', 'lifestyle'] },
  { name: 'Mashable', url: 'https://mashable.com/feeds/rss/all', categories: ['culture', 'tech', 'lifestyle'] },
  {
    name: 'prnewswire (tech)',
    url: 'https://www.prnewswire.com/rss/technology-latest-news.rss',
    categories: ['tech'],
  },
  {
    name: 'prnewswire (food)',
    url: 'https://www.prnewswire.com/rss/food-beverages-latest-news.rss',
    categories: ['food'],
  },
  {
    name: 'prnewswire (energy)',
    url: 'https://www.prnewswire.com/rss/energy-latest-news.rss',
    categories: ['energy'],
  },
  {
    name: 'prnewswire (telecoms)',
    url: 'https://www.prnewswire.com/rss/telecommunications-latest-news.rss',
    categories: ['telecoms'],
  },
  {
    name: 'prnewswire (lifestyle)',
    url: 'https://www.prnewswire.com/rss/lifestyle-latest-news.rss',
    categories: ['lifestyle'],
  },

  // Entertainment & pop culture
  { name: 'Vulture', url: 'http://feeds.feedburner.com/nymag/vulture', categories: ['entertainment'] },
  { name: 'The A.V. Club', url: 'https://www.avclub.com/rss', categories: ['entertainment'] },
  { name: 'Variety', url: 'https://variety.com/feed/', categories: ['entertainment'] },
  { name: 'The Hollywood Reporter', url: 'https://www.hollywoodreporter.com/feed/', categories: ['entertainment'] },
  { name: 'Pitchfork', url: 'https://pitchfork.com/rss/news/', categories: ['entertainment'] },
  { name: 'Rolling Stone', url: 'https://www.rollingstone.com/feed/', categories: ['entertainment'] },
  { name: 'Consequence', url: 'https://consequence.net/feed/', categories: ['entertainment'] },
  { name: 'IndieWire', url: 'https://www.indiewire.com/feed/', categories: ['entertainment'] },
  { name: 'Polygon', url: 'https://www.polygon.com/rss/index.xml', categories: ['entertainment'] },
  { name: 'The Ringer', url: 'https://www.theringer.com/rss/index.xml', categories: ['entertainment'] },

  // Social media & internet culture
  { name: 'Know Your Meme', url: 'https://knowyourmeme.com/newsfeed.rss', categories: ['internet-culture'] },
  { name: 'Kotaku', url: 'https://kotaku.com/rss', categories: ['internet-culture'] },
  { name: 'Dazed', url: 'https://www.dazeddigital.com/feed', categories: ['internet-culture'] },
  { name: 'Highsnobiety', url: 'https://www.highsnobiety.com/feed/', categories: ['internet-culture', 'fashion'] },
  // Skipped: Garbage Day, Embedded (Ryan Broderick), Blackbird Spyplane —
  // no confirmed RSS URL. Add them here once you've found a working feed.

  // Society, sociology, anthropology
  { name: 'Aeon', url: 'https://aeon.co/feed.rss', categories: ['society'] },
  { name: 'Psyche', url: 'https://psyche.co/feed.rss', categories: ['society'] },
  { name: 'The Conversation (UK)', url: 'https://theconversation.com/uk/feeds/all.atom', categories: ['society'] },
  { name: 'Sapiens.org', url: 'https://www.sapiens.org/feed/', categories: ['society'] },
  { name: 'Real Life Mag', url: 'https://reallifemag.com/feed/', categories: ['society'] },
  { name: 'n+1', url: 'https://www.nplusonemag.com/feed/', categories: ['society'] },
  { name: 'The Baffler', url: 'https://thebaffler.com/feed', categories: ['society'] },
  { name: 'Boston Review', url: 'https://www.bostonreview.net/feed/', categories: ['society'] },
  { name: 'Jacobin', url: 'https://jacobin.com/feed/', categories: ['society'] },
  // Skipped: Anthropology News (AAA) — no reliable public feed found.

  // General culture/ideas magazines
  { name: 'The Atlantic (Culture)', url: 'https://www.theatlantic.com/feed/channel/entertainment/', categories: ['culture'] },
  { name: 'The New Yorker', url: 'https://www.newyorker.com/feed/everything', categories: ['culture'] },
  { name: 'The New Republic', url: 'https://newrepublic.com/rss.xml', categories: ['culture'] },
  { name: 'New York Magazine (Intelligencer)', url: 'https://nymag.com/rss/intelligencer.xml', categories: ['culture'] },
  { name: 'Slate (Culture)', url: 'https://slate.com/feeds/culture.rss', categories: ['culture'] },
  { name: 'The Guardian (Culture)', url: 'https://www.theguardian.com/culture/rss', categories: ['culture'] },
  { name: 'London Review of Books', url: 'https://www.lrb.co.uk/feeds/rss', categories: ['culture'] },
  // Skipped: Harper's — no reliable public feed found.

  // Forums and discussion. Reddit's .rss endpoints are the most likely of
  // this whole batch to get blocked from a GitHub Actions IP — that's what
  // the health-check summary at the end of each run is for.
  { name: 'r/sociology', url: 'https://old.reddit.com/r/sociology/.rss', categories: ['forums', 'society'] },
  { name: 'r/anthropology', url: 'https://old.reddit.com/r/anthropology/.rss', categories: ['forums', 'society'] },
  { name: 'r/OutOfTheLoop', url: 'https://old.reddit.com/r/OutOfTheLoop/.rss', categories: ['forums'] },
  { name: 'r/CulturalStudies', url: 'https://old.reddit.com/r/CulturalStudies/.rss', categories: ['forums', 'culture'] },
  { name: 'r/SocialMedia', url: 'https://old.reddit.com/r/SocialMedia/.rss', categories: ['forums', 'internet-culture'] },
  { name: 'Hacker News', url: 'https://hnrss.org/frontpage', categories: ['forums', 'tech'] },
  { name: 'Metafilter', url: 'https://www.metafilter.com/index.rdf', categories: ['forums'] },

  // Trend and youth culture
  { name: 'Trend Hunter', url: 'https://www.trendhunter.com/rss/current', categories: ['trends'] },
  // Skipped: Contagious and WGSN — paywalled, no open feed.
];

const parser = new Parser({
  headers: {
    'User-Agent':
      'SignalTrackerBot/1.0 (personal non-commercial news aggregator; contact via GitHub repo)',
  },
  timeout: 15000,
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function makeId(link, title) {
  return crypto.createHash('sha1').update(link || title || '').digest('hex').slice(0, 16);
}

function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 400);
}

function extractImage(item) {
  if (item.enclosure?.url) return item.enclosure.url;
  const mediaContent = item['media:content'];
  if (mediaContent?.$?.url) return mediaContent.$.url;
  const html = item['content:encoded'] || item.content || '';
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match ? match[1] : '';
}

async function fetchFeed(source) {
  try {
    const feed = await parser.parseURL(source.url);
    const items = (feed.items || []).map((item) => {
      const link = item.link || '';
      const title = item.title || 'Untitled';
      return {
        id: makeId(link, title),
        title,
        url: link,
        datePublished: item.isoDate || (item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString()),
        category: source.categories,
        description: stripHtml(item.contentSnippet || item.content || item.summary || ''),
        author: item.creator || item.author || '',
        imageUrl: extractImage(item),
        source: source.name,
      };
    });
    return { items, error: null };
  } catch (err) {
    return { items: [], error: err.message };
  }
}

// Placeholder for direct HTML scraping (cheerio + axios) if a source ever
// stops publishing RSS. Intentionally left minimal for the MVP.
// async function scrapeHtmlFallback(url) { ... }

async function loadCustomSources() {
  try {
    const raw = await readFile(SOURCES_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    return (parsed.customSources || [])
      .filter((s) => s.type === 'rss' && s.url)
      .map((s) => ({ name: s.name || s.url, url: s.url, categories: s.categories || [] }));
  } catch (err) {
    console.warn(`[scraper] Could not read sources.json, skipping custom sources: ${err.message}`);
    return [];
  }
}

async function loadExistingArticles() {
  try {
    const raw = await readFile(DATA_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : parsed.articles || [];
  } catch {
    return [];
  }
}

// Flags any feed that came back broken or empty, so you don't have to check
// 40+ URLs by hand to find the ones that have drifted. Prints to the console
// either way, and — when run inside GitHub Actions — also writes to the job
// summary so it shows up as a readable table on the run's page, not just
// buried in the log.
function buildHealthReport(results) {
  const failed = results.filter((r) => r.status !== 'ok');
  const lines = [];

  lines.push('');
  lines.push('=== Feed health check ===');
  results.forEach((r) => {
    const icon = r.status === 'ok' ? '✓' : r.status === 'empty' ? '⚠' : '✗';
    const detail = r.status === 'error' ? r.error : `${r.count} item(s)`;
    lines.push(`${icon} ${r.name}: ${detail}`);
  });

  if (failed.length) {
    lines.push('');
    lines.push(`${failed.length} of ${results.length} source(s) need attention:`);
    failed.forEach((r) => {
      lines.push(`  - ${r.name} (${r.url}) — ${r.status === 'error' ? r.error : 'returned 0 items'}`);
    });
  } else {
    lines.push('');
    lines.push('All sources returned data.');
  }

  console.log(lines.join('\n'));

  if (process.env.GITHUB_STEP_SUMMARY) {
    const rows = results
      .map((r) => {
        const icon = r.status === 'ok' ? '✅' : r.status === 'empty' ? '⚠️' : '❌';
        const detail = r.status === 'error' ? r.error : `${r.count} item(s)`;
        return `| ${icon} | ${r.name} | ${detail} |`;
      })
      .join('\n');
    const summary = [
      '## Feed health check',
      failed.length
        ? `**${failed.length} of ${results.length} source(s) need attention.**`
        : '**All sources returned data.**',
      '',
      '| | Source | Result |',
      '|---|---|---|',
      rows,
    ].join('\n');
    return writeFile(process.env.GITHUB_STEP_SUMMARY, summary + '\n', { flag: 'a' });
  }
  return Promise.resolve();
}

async function main() {
  const customSources = await loadCustomSources();
  const allSources = [...BUILT_IN_SOURCES, ...customSources];

  console.log(`[scraper] Fetching ${allSources.length} source(s)...`);

  const fetched = [];
  const results = [];
  for (const source of allSources) {
    const { items, error } = await fetchFeed(source);
    const status = error ? 'error' : items.length === 0 ? 'empty' : 'ok';
    results.push({ name: source.name, url: source.url, status, count: items.length, error });
    console.log(
      `[scraper]   ${source.name}: ${error ? `error — ${error}` : `${items.length} item(s)`}`
    );
    fetched.push(...items);
    await sleep(REQUEST_DELAY_MS);
  }

  await buildHealthReport(results);

  const existing = await loadExistingArticles();
  const byId = new Map(existing.map((a) => [a.id, a]));
  fetched.forEach((a) => {
    if (!byId.has(a.id)) byId.set(a.id, a);
  });

  const merged = [...byId.values()]
    .sort((a, b) => new Date(b.datePublished) - new Date(a.datePublished))
    .slice(0, MAX_ARTICLES);

  await mkdir(path.dirname(DATA_PATH), { recursive: true });
  await writeFile(
    DATA_PATH,
    JSON.stringify({ generatedAt: new Date().toISOString(), articles: merged }, null, 2)
  );

  console.log(`[scraper] Wrote ${merged.length} article(s) to ${path.relative(ROOT, DATA_PATH)}`);
}

main().catch((err) => {
  console.error('[scraper] Fatal error:', err);
  process.exit(1);
});
