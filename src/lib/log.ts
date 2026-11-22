import "server-only";

/** One JSON line per event, visible in Netlify's function logs (and the dev server console). */
export function log(event: string, data: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ t: new Date().toISOString(), event, ...data }));
}
