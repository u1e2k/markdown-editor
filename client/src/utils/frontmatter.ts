// YAML frontmatter のパース・シリアライズ

export interface Frontmatter {
  tags?: string[];
  created?: string;
  updated?: string;
  status?: string;
  [key: string]: any;
}

export function parseFrontmatter(content: string): { frontmatter: Frontmatter; body: string } {
  console.log('[parseFrontmatter] Input content:', JSON.stringify(content));
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    console.log('[parseFrontmatter] No match found, returning empty frontmatter');
    return { frontmatter: {}, body: content };
  }

  const frontmatterText = match[1];
  const body = match[2];
  const frontmatter: Frontmatter = {};

  // 簡易YAMLパーサー（基本的なキー:値のみサポート）
  const lines = frontmatterText.split('\n');
  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;

    const key = line.substring(0, colonIndex).trim();
    const value = line.substring(colonIndex + 1).trim();

    // 配列（タグなど）のパース
    if (value.startsWith('[') && value.endsWith(']')) {
      const items = value
        .substring(1, value.length - 1)
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
      frontmatter[key] = items;
    } else {
      frontmatter[key] = value;
    }
  }

  console.log('[parseFrontmatter] Parsed result:', { frontmatter, body: body.substring(0, 50) });
  return { frontmatter, body };
}

export function stringifyFrontmatter(frontmatter: Frontmatter, body: string): string {
  console.log('[stringifyFrontmatter] Input frontmatter:', frontmatter);
  const keys = Object.keys(frontmatter);
  if (keys.length === 0) {
    return body;
  }

  let frontmatterText = '---\n';
  for (const key of keys) {
    const value = frontmatter[key];
    if (Array.isArray(value)) {
      frontmatterText += `${key}: [${value.join(', ')}]\n`;
    } else {
      frontmatterText += `${key}: ${value}\n`;
    }
  }
  frontmatterText += '---\n';

  return frontmatterText + body;
}
