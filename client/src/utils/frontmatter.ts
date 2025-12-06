// YAML frontmatter のパース・シリアライズ

export interface Frontmatter {
  tags?: string[];
  created?: string;
  updated?: string;
  status?: string;
  [key: string]: any;
}

export function parseFrontmatter(content: string): { frontmatter: Frontmatter; body: string } {
  // contentが空またはnullの場合
  if (!content || content.trim() === '') {
    console.log('[parseFrontmatter] Content is empty, returning empty frontmatter');
    return { frontmatter: {}, body: '' };
  }

  console.log('[parseFrontmatter] Input content length:', content.length);

  // 先頭の空白や空行、---の後の空白も許容する柔軟な正規表現
  const frontmatterRegex = /^\s*---\s*\n([\s\S]*?)\n---\s*\n?/;
  let match = content.match(frontmatterRegex);
  let workingContent = content;

  if (!match) {
    console.log('[parseFrontmatter] No frontmatter found in content, treating entire content as body');
    // frontmatterが無ければ空のfrontmatterを返す
    return { frontmatter: {}, body: content };
  }

  const frontmatterText = match[1];
  // フロントマター部分を除去した本文を取得
  const body = workingContent.replace(frontmatterRegex, '');
  const frontmatter: Frontmatter = {};

  // 簡易YAMLパーサー（基本的なキー:値のみサポート）
  const lines = frontmatterText.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // 空行やコメント行をスキップ
    if (!line.trim() || line.trim().startsWith('#')) continue;

    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;

    const key = line.substring(0, colonIndex).trim();
    let value = line.substring(colonIndex + 1).trim();

    // キーが引用符で囲まれている場合、無効な行として扱う
    if (key.startsWith("'") || key.startsWith('"')) {
      console.log('[parseFrontmatter] Skipping invalid YAML line with quoted key:', line);
      continue;
    }

    // 配列（タグなど）のパース
    if (value.startsWith('[') && value.endsWith(']')) {
      const items = value
        .substring(1, value.length - 1)
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
      frontmatter[key] = items;
    } else if (value.startsWith('-')) {
      // YAML配列形式の対応（次の行以降がある場合のみ）
      const arrayItems: string[] = [];
      // 最初の要素を追加
      const firstItem = value.substring(1).trim();
      if (firstItem) arrayItems.push(firstItem);
      
      // 次の行から続く配列要素を取得
      i++;
      while (i < lines.length) {
        const nextLine = lines[i];
        if (!nextLine.startsWith('-')) break;
        arrayItems.push(nextLine.substring(1).trim());
        i++;
      }
      i--; // ループで+1されるため戻す
      
      if (arrayItems.length > 0) {
        frontmatter[key] = arrayItems;
      }
    } else {
      frontmatter[key] = value;
    }
  }

  console.log('[parseFrontmatter] Parsed frontmatter keys:', Object.keys(frontmatter));
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
