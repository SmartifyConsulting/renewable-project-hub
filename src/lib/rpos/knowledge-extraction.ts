export type CandidateFact = { key: string; value: string; excerpt: string };

export function parseCandidateFacts(text: string, limit = 50): CandidateFact[] {
  const candidates: CandidateFact[] = [];
  const seen = new Set<string>();
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.length > 4000) continue;
    const separator = line.indexOf(":");
    if (separator < 2) continue;
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    if (key.length < 2 || key.length > 120 || value.length < 1 || value.length > 4000) continue;
    const signature = key.toLowerCase() + "\u0000" + value.toLowerCase();
    if (seen.has(signature)) continue;
    seen.add(signature);
    candidates.push({ key, value, excerpt: line });
    if (candidates.length >= limit) break;
  }
  return candidates;
}
