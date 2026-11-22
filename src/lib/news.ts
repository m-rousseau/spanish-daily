import "server-only";
import { XMLParser } from "fast-xml-parser";

// Spanish-language news feeds: Spain (Europa Press), Latin America and the world (BBC Mundo, DW).
const FEEDS = [
  { source: "BBC Mundo", url: "https://feeds.bbci.co.uk/mundo/rss.xml" },
  { source: "Europa Press", url: "https://www.europapress.es/rss/rss.aspx" },
  { source: "DW Español", url: "https://rss.dw.com/xml/rss-sp-all" },
];

export type Headline = { title: string; summary: string; url: string; source: string };

let cache: { at: number; items: Headline[] } | null = null;
const CACHE_MS = 60 * 60 * 1000; // refresh at most hourly

const parser = new XMLParser({ ignoreAttributes: true, cdataPropName: false, processEntities: true });

function text(v: unknown): string {
  if (typeof v === "string") return v;
  if (v && typeof v === "object" && "#text" in v) return String((v as { "#text": unknown })["#text"]);
  return v == null ? "" : String(v);
}

const clean = (s: string) => s.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();

async function fetchFeed(feed: (typeof FEEDS)[number]): Promise<Headline[]> {
  const res = await fetch(feed.url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; EspanolDiario/1.0)" },
    signal: AbortSignal.timeout(5000),
    cache: "no-store",
  });
  if (!res.ok) return [];
  const doc = parser.parse(await res.text());
  const items: unknown[] = [doc?.rss?.channel?.item ?? []].flat();
  return items.slice(0, 12).flatMap((raw) => {
    const it = raw as Record<string, unknown>;
    const title = clean(text(it.title));
    const url = text(it.link).trim();
    if (!title || !url.startsWith("https://")) return [];
    return [{ title, summary: clean(text(it.description)).slice(0, 300), url, source: feed.source }];
  });
}

/** Today's headlines; empty if every feed fails (the news question is then skipped). */
export async function getHeadlines(): Promise<Headline[]> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.items;
  const results = await Promise.allSettled(FEEDS.map(fetchFeed));
  const items = results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
  if (items.length) cache = { at: Date.now(), items };
  return items;
}
