/**
 * Accepts a service-account private key however it was pasted: the bare PEM,
 * the JSON string value (quotes, literal \n, trailing comma), or the whole JSON
 * key file. Rebuilds a clean PKCS#8 PEM. On failure, returns only the shape of
 * the value (never its contents) for logging.
 */
export function parseServiceAccount(
  rawKey: string,
  rawEmail: string,
): { email: string; pem: string } | { error: string; shape: Record<string, unknown> } {
  const raw = rawKey.trim();
  let email = rawEmail.trim();
  let source = raw;
  if (raw.startsWith("{")) {
    try {
      const json = JSON.parse(raw);
      source = json.private_key ?? raw;
      email = email || json.client_email || "";
    } catch {
      // fall through to the pattern below
    }
  }
  const unescaped = source.replace(/\\\\n/g, "\n").replace(/\\n/g, "\n");
  let m = unescaped.match(/-----BEGIN (?:RSA )?PRIVATE KEY-----([\s\S]*?)-----END (?:RSA )?PRIVATE KEY-----/);
  if (!m) {
    // Header and footer lines missing (only the middle was copied): accept a long base64 body.
    const bare = unescaped.replace(/-----(BEGIN|END)[^-]*-----/g, "").replace(/^["',\s]+|["',\s]+$/g, "");
    if (bare.length >= 1000 && /^[A-Za-z0-9+/=\s]+$/.test(bare)) m = ["", bare] as unknown as RegExpMatchArray;
  }
  if (!m) {
    return {
      error: "GOOGLE_SERVICE_ACCOUNT_KEY doesn't contain a private key block",
      shape: {
        length: raw.length,
        hasBegin: raw.includes("BEGIN"),
        startsWithQuote: raw.startsWith('"'),
        looksLikeJson: raw.startsWith("{"),
        literalBackslashN: raw.includes("\\n"),
        realNewlines: raw.includes("\n"),
      },
    };
  }
  const body = m[1].replace(/[^A-Za-z0-9+/=]/g, "");
  const lines = body.match(/.{1,64}/g) ?? [];
  return { email, pem: `-----BEGIN PRIVATE KEY-----\n${lines.join("\n")}\n-----END PRIVATE KEY-----\n` };
}
