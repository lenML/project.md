import yaml from "js-yaml";

const FM_DELIM = "---";

export interface ParseResult {
  metadata: Record<string, unknown>;
  body: string;
}

export function parseFrontmatter(content: string): ParseResult | null {
  const trimmed = content.trimStart();
  if (!trimmed.startsWith(FM_DELIM)) return null;
  const endIdx = trimmed.indexOf("\n" + FM_DELIM, 3);
  if (endIdx === -1) return null;
  const yamlText = trimmed.slice(3, endIdx);
  const body = trimmed.slice(endIdx + 4).trimStart();
  try {
    const metadata = yaml.load(yamlText) as Record<string, unknown>;
    return { metadata, body };
  } catch {
    return null;
  }
}

function shortHash(text: string): string {
  const data = new TextEncoder().encode(text);
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5) - hash) + data[i];
    hash |= 0;
  }
  return (hash >>> 0).toString(16).padStart(8, "0").slice(0, 8);
}

export interface CheckboxItem {
  text: string;
  checked: boolean;
  hash: string;
}

export function parseCheckboxes(content: string): CheckboxItem[] {
  const items: CheckboxItem[] = [];
  const lines = content.split("\n");
  for (const line of lines) {
    const m = line.match(/^\s*[-*]\s\[( |x|X)\]\s(.+)$/);
    if (m) {
      const text = m[2].trim();
      items.push({ text, checked: m[1] === "x" || m[1] === "X", hash: shortHash(text) });
    }
  }
  return items;
}
