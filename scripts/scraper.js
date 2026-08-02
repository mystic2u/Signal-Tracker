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
    return (feed.items || []).map((item) => {
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
  } catch (err) {
    console.error(`[scraper] Failed to fetch "${source.name}" (${source.url}): ${err.message}`);
    return [];
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

async function main() {
  const customSources = await loadCustomSources();
  const allSources = [...BUILT_IN_SOURCES, ...customSources];

  console.log(`[scraper] Fetching ${allSources.length} source(s)...`);

  const fetched = [];
  for (const source of allSources) {
    const items = await fetchFeed(source);
    console.log(`[scraper]   ${source.name}: ${items.length} item(s)`);
    fetched.push(...items);
    await sleep(REQUEST_DELAY_MS);
  }

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
