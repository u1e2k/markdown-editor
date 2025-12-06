import { useEffect, useRef } from 'react';
import { EditorState, Extension } from '@codemirror/state';
import { EditorView, keymap, highlightActiveLine, Decoration, DecorationSet, ViewPlugin, ViewUpdate, WidgetType } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import { syntaxHighlighting, HighlightStyle } from '@codemirror/language';
import { tags } from '@lezer/highlight';

interface CodeMirrorEditorProps {
  value: string;
  onChange: (value: string) => void;
}

// インライン要素のマーカーを隠すウィジェット
class HideWidget extends WidgetType {
  toDOM() {
    const span = document.createElement('span');
    span.style.display = 'none';
    return span;
  }
  ignoreEvent() { return false; }
}

// Wikiリンクのウィジェット
class WikiLinkWidget extends WidgetType {
  constructor(readonly text: string) {
    super();
  }

  toDOM() {
    const link = document.createElement('span');
    link.textContent = this.text;
    link.style.color = '#7f8c8d';
    link.style.cursor = 'pointer';
    link.style.textDecoration = 'underline';
    return link;
  }
}

// インラインコードのウィジェット
class InlineCodeWidget extends WidgetType {
  constructor(readonly text: string) {
    super();
  }

  toDOM() {
    const code = document.createElement('code');
    code.textContent = this.text;
    code.style.fontFamily = '"Fira Code", "JetBrains Mono", Consolas, Monaco, monospace';
    code.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
    code.style.color = '#e96379';
    code.style.padding = '0.15em 0.35em';
    code.style.borderRadius = '3px';
    code.style.fontSize = '0.85em';
    return code;
  }
}

// リンクのウィジェット
class LinkWidget extends WidgetType {
  constructor(readonly text: string, readonly url: string) {
    super();
  }

  toDOM() {
    const link = document.createElement('span');
    link.textContent = this.text;
    link.style.color = '#7f8c8d';
    link.style.textDecoration = 'underline';
    link.style.cursor = 'pointer';
    link.title = this.url;
    return link;
  }
}

// 画像のウィジェット
class ImageWidget extends WidgetType {
  constructor(readonly alt: string, readonly url: string) {
    super();
  }

  toDOM() {
    const container = document.createElement('span');
    container.style.display = 'inline-block';
    container.style.margin = '0 4px';
    
    const img = document.createElement('img');
    img.src = this.url;
    img.alt = this.alt;
    img.style.maxWidth = '100%';
    img.style.maxHeight = '300px';
    img.style.borderRadius = '4px';
    img.style.verticalAlign = 'middle';
    
    container.appendChild(img);
    return container;
  }
}

// 見出しのウィジェット
class HeadingWidget extends WidgetType {
  constructor(readonly text: string, readonly level: number) {
    super();
  }

  toDOM() {
    const heading = document.createElement(`h${this.level}`);
    heading.textContent = this.text;
    const sizes = ['1.65em', '1.4em', '1.2em', '1.05em', '0.95em', '0.85em'];
    heading.style.fontSize = sizes[this.level - 1];
    heading.style.fontWeight = this.level <= 2 ? '700' : '600';
    heading.style.color = '#dcddde';
    heading.style.lineHeight = 'inherit';
    heading.style.margin = '0';
    heading.style.padding = '0';
    heading.style.fontFamily = 'inherit';
    heading.style.display = 'inline';
    return heading;
  }
}

// リストアイテムのウィジェット
class ListItemWidget extends WidgetType {
  constructor(readonly text: string, readonly indent: number, readonly marker: string) {
    super();
  }

  toDOM() {
    const span = document.createElement('span');
    span.style.paddingLeft = `${this.indent * 20}px`;
    span.style.color = '#dcddde';
    span.style.lineHeight = 'inherit';
    span.style.display = 'inline';
    
    const bullet = document.createElement('span');
    bullet.textContent = this.marker === '-' || this.marker === '*' || this.marker === '+' ? '• ' : `${this.marker} `;
    bullet.style.color = '#7f8c8d';
    bullet.style.marginRight = '0.5em';
    
    const content = document.createElement('span');
    content.textContent = this.text;
    
    span.appendChild(bullet);
    span.appendChild(content);
    return span;
  }
}

// 引用ブロックのウィジェット
class BlockquoteWidget extends WidgetType {
  constructor(readonly text: string, readonly level: number) {
    super();
  }

  toDOM() {
    const span = document.createElement('span');
    span.style.borderLeft = '3px solid rgba(127, 140, 141, 0.4)';
    span.style.paddingLeft = `${10 + this.level * 10}px`;
    span.style.marginLeft = `${this.level * 4}px`;
    span.style.color = '#9ca3af';
    span.style.lineHeight = 'inherit';
    span.style.display = 'inline';
    span.textContent = this.text;
    return span;
  }
}

// タスクリストのウィジェット
class TaskListWidget extends WidgetType {
  constructor(readonly text: string, readonly checked: boolean, readonly indent: number) {
    super();
  }

  toDOM() {
    const span = document.createElement('span');
    span.style.paddingLeft = `${this.indent * 20}px`;
    span.style.color = '#dcddde';
    span.style.lineHeight = 'inherit';
    span.style.display = 'inline';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = this.checked;
    checkbox.style.marginRight = '0.5em';
    checkbox.style.cursor = 'pointer';
    checkbox.style.verticalAlign = 'middle';
    
    const content = document.createElement('span');
    content.textContent = this.text;
    if (this.checked) {
      content.style.textDecoration = 'line-through';
      content.style.opacity = '0.5';
    }
    
    span.appendChild(checkbox);
    span.appendChild(content);
    return span;
  }
}

// 水平線のウィジェット
class HorizontalRuleWidget extends WidgetType {
  toDOM() {
    const hr = document.createElement('hr');
    hr.style.border = 'none';
    hr.style.borderTop = '1px solid rgba(127, 140, 141, 0.2)';
    hr.style.margin = '0';
    hr.style.height = '0';
    return hr;
  }
}

// ライブプレビュープラグイン
const livePreviewPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = this.buildDecorations(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.selectionSet || update.viewportChanged) {
        this.decorations = this.buildDecorations(update.view);
      }
    }

    // シンタックスハイライト用の範囲を取得
    getHighlightRanges(text: string, lang: string): { from: number; to: number; class: string }[] {
      const ranges: { from: number; to: number; class: string }[] = [];
      
      console.log(`[getHighlightRanges] Called with lang: "${lang}", text length: ${text.length}`);
      
      // 正規表現パターンと対応するクラス
      const patterns: { pattern: RegExp; className: string; languages?: string[] }[] = [];
      
      // JavaScript/TypeScript用のパターン
      if (lang === 'javascript' || lang === 'js' || lang === 'typescript' || lang === 'ts' || lang === 'jsx' || lang === 'tsx') {
        console.log('[getHighlightRanges] Matched JavaScript/TypeScript');
        patterns.push(
          { pattern: /\b(const|let|var|function|return|if|else|for|while|class|extends|import|export|from|default|async|await|try|catch|throw|new|this|super|static|get|set|typeof|instanceof|break|continue|switch|case)\b/g, className: 'cm-syntax-keyword' },
          { pattern: /"([^"\\]|\\.)*"|'([^'\\]|\\.)*'|`([^`\\]|\\.)*`/g, className: 'cm-syntax-string' },
          { pattern: /\/\/.*$/gm, className: 'cm-syntax-comment' },
          { pattern: /\/\*[\s\S]*?\*\//g, className: 'cm-syntax-comment' },
          { pattern: /\b\d+\.?\d*\b/g, className: 'cm-syntax-number' },
          { pattern: /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?=\()/g, className: 'cm-syntax-function' }
        );
      } else if (lang === 'python' || lang === 'py') {
        patterns.push(
          { pattern: /\b(def|class|if|elif|else|for|while|return|import|from|as|try|except|finally|with|lambda|yield|async|await|True|False|None|and|or|not|in|is|pass|break|continue)\b/g, className: 'cm-syntax-keyword' },
          { pattern: /"([^"\\]|\\.)*"|'([^'\\]|\\.)*'/g, className: 'cm-syntax-string' },
          { pattern: /#.*$/gm, className: 'cm-syntax-comment' },
          { pattern: /\b\d+\.?\d*\b/g, className: 'cm-syntax-number' },
          { pattern: /\b([a-zA-Z_][a-zA-Z0-9_]*)\s*(?=\()/g, className: 'cm-syntax-function' }
        );
      } else if (lang === 'html' || lang === 'xml') {
        patterns.push(
          { pattern: /<\/?[a-zA-Z][a-zA-Z0-9]*\b/g, className: 'cm-syntax-tag' },
          { pattern: /\b[a-zA-Z-]+(?==)/g, className: 'cm-syntax-attribute' },
          { pattern: /"[^"]*"|'[^']*'/g, className: 'cm-syntax-string' }
        );
      } else if (lang === 'css' || lang === 'scss') {
        patterns.push(
          { pattern: /[.#]?[a-zA-Z][a-zA-Z0-9-_]*/g, className: 'cm-syntax-selector' },
          { pattern: /\b[a-zA-Z-]+(?=:)/g, className: 'cm-syntax-property' },
          { pattern: /:\s*[^;{]+/g, className: 'cm-syntax-value' },
          { pattern: /\b\d+\.?\d*(px|em|rem|%|vh|vw)?\b/g, className: 'cm-syntax-number' }
        );
      } else if (lang === 'json') {
        patterns.push(
          { pattern: /"[^"]+"\s*:/g, className: 'cm-syntax-property' },
          { pattern: /:\s*"[^"]*"/g, className: 'cm-syntax-string' },
          { pattern: /\b(true|false|null)\b/g, className: 'cm-syntax-keyword' },
          { pattern: /\b\d+\.?\d*\b/g, className: 'cm-syntax-number' }
        );
      } else if (lang === 'bash' || lang === 'sh' || lang === 'shell') {
        patterns.push(
          { pattern: /#.*$/gm, className: 'cm-syntax-comment' },
          { pattern: /"[^"]*"|'[^']*'/g, className: 'cm-syntax-string' },
          { pattern: /\b(if|then|else|elif|fi|for|while|do|done|case|esac|function)\b/g, className: 'cm-syntax-keyword' }
        );
      } else if (lang === 'rust' || lang === 'rs') {
        patterns.push(
          { pattern: /\b(fn|let|mut|const|if|else|match|for|while|loop|return|impl|trait|struct|enum|pub|use|mod|crate|self|super|as|ref|move|async|await|unsafe|extern)\b/g, className: 'cm-syntax-keyword' },
          { pattern: /"([^"\\]|\\.)*"/g, className: 'cm-syntax-string' },
          { pattern: /\/\/.*$/gm, className: 'cm-syntax-comment' },
          { pattern: /\/\*[\s\S]*?\*\//g, className: 'cm-syntax-comment' },
          { pattern: /\b\d+\.?\d*\b/g, className: 'cm-syntax-number' }
        );
      }
      
      // パターンにマッチする範囲を収集
      console.log(`[getHighlightRanges] Processing ${patterns.length} patterns`);
      for (const { pattern, className } of patterns) {
        // 正規表現を新しく作成してlastIndexをリセット
        const regex = new RegExp(pattern.source, pattern.flags);
        let match;
        let matchCount = 0;
        while ((match = regex.exec(text)) !== null) {
          matchCount++;
          ranges.push({
            from: match.index,
            to: match.index + match[0].length,
            class: className
          });
        }
        console.log(`[getHighlightRanges] Pattern ${className}: ${matchCount} matches`);
      }
      
      console.log(`[getHighlightRanges] Total ranges before filtering: ${ranges.length}`);
      
      // 範囲をソート
      ranges.sort((a, b) => {
        if (a.from !== b.from) return a.from - b.from;
        if (a.to !== b.to) return a.to - b.to;
        return 0;
      });
      
      // 重複する範囲を除外(優先度: より前に定義されたパターンが優先)
      const filteredRanges: typeof ranges = [];
      for (const range of ranges) {
        const overlaps = filteredRanges.some(r => 
          (range.from >= r.from && range.from < r.to) ||
          (range.to > r.from && range.to <= r.to) ||
          (range.from <= r.from && range.to >= r.to)
        );
        if (!overlaps) {
          filteredRanges.push(range);
        }
      }
      
      console.log(`[getHighlightRanges] Final ranges: ${filteredRanges.length}`);
      return filteredRanges;
    }

    buildDecorations(view: EditorView): DecorationSet {
      const markDecorations: any[] = [];  // Decoration.mark
      const lineDecorations: any[] = [];  // Decoration.line
      const replaceDecorations: any[] = []; // Decoration.replace
      const cursorLine = view.state.doc.lineAt(view.state.selection.main.head).number;
      
      // コードブロックの検出と収集
      const codeBlockLines = new Set<number>();
      let inCodeBlock = false;
      let codeBlockStartLine = 0;
      let codeBlockLanguage = '';
      const codeBlockInfo: { start: number; end: number; language: string }[] = [];
      
      for (let i = 1; i <= view.state.doc.lines; i++) {
        const line = view.state.doc.line(i);
        const lineText = line.text;
        
        if (lineText.trim().startsWith('```')) {
          if (!inCodeBlock) {
            inCodeBlock = true;
            codeBlockStartLine = i;
            codeBlockLines.add(i);
            // 言語指定を取得（```javascript など）
            codeBlockLanguage = lineText.trim().substring(3).trim();
          } else {
            codeBlockLines.add(i);
            codeBlockInfo.push({ 
              start: codeBlockStartLine, 
              end: i, 
              language: codeBlockLanguage
            });
            inCodeBlock = false;
            codeBlockLanguage = '';
          }
        } else if (inCodeBlock) {
          codeBlockLines.add(i);
        }
      }

      // 各行を処理
      for (let lineNum = 1; lineNum <= view.state.doc.lines; lineNum++) {
        // カーソルがある行はスキップ（編集モード）
        if (lineNum === cursorLine) {
          continue;
        }
        
        const line = view.state.doc.line(lineNum);
        const lineText = line.text;
        
        // コードブロック内の処理
        if (codeBlockLines.has(lineNum)) {
          const block = codeBlockInfo.find(b => lineNum >= b.start && lineNum <= b.end);
          const blockContainsCursor = block && cursorLine >= block.start && cursorLine <= block.end;
          
          if (blockContainsCursor) {
            continue;
          }
          
          // ```で始まる行(コードブロックの開始・終了)は非表示に
          if (lineText.trim().startsWith('```')) {
            replaceDecorations.push(
              Decoration.replace({
                widget: new HideWidget(),
              }).range(line.from, line.to)
            );
          } else {
            // シンタックスハイライトを追加（マークデコレーション）
            if (block) {
              const highlights = this.getHighlightRanges(lineText, block.language);
              console.log(`[Syntax] Line ${lineNum}, Lang: ${block.language}, Text: "${lineText}", Highlights:`, highlights);
              for (const hl of highlights) {
                markDecorations.push(
                  Decoration.mark({
                    class: hl.class,
                  }).range(line.from + hl.from, line.from + hl.to)
                );
              }
            }
            
            // コードブロック内のコード行:背景色を適用（ラインデコレーション）
            lineDecorations.push(
              Decoration.line({
                class: 'cm-code-block-line',
              }).range(line.from)
            );
          }
          continue;
        }

        // 見出し
        const headingMatch = lineText.match(/^(#{1,6})\s+(.+)$/);
        if (headingMatch) {
          const level = headingMatch[1].length;
          const text = headingMatch[2];
          
          replaceDecorations.push(
            Decoration.replace({
              widget: new HeadingWidget(text, level),
            }).range(line.from, line.to)
          );
          continue;
        }

        // 水平線
        if (lineText.match(/^(\*\*\*+|---+|___+)\s*$/)) {
          replaceDecorations.push(
            Decoration.replace({
              widget: new HorizontalRuleWidget(),
            }).range(line.from, line.to)
          );
          continue;
        }

        // 引用ブロック
        const quoteMatch = lineText.match(/^(>+)\s*(.*)$/);
        if (quoteMatch) {
          const level = quoteMatch[1].length;
          const text = quoteMatch[2];
          
          replaceDecorations.push(
            Decoration.replace({
              widget: new BlockquoteWidget(text, level - 1),
            }).range(line.from, line.to)
          );
          continue;
        }

        // タスクリスト
        const taskMatch = lineText.match(/^(\s*)([-*+])\s+\[([ xX])\]\s+(.+)$/);
        if (taskMatch) {
          const indent = Math.floor(taskMatch[1].length / 2);
          const checked = taskMatch[3].toLowerCase() === 'x';
          const text = taskMatch[4];
          
          replaceDecorations.push(
            Decoration.replace({
              widget: new TaskListWidget(text, checked, indent),
            }).range(line.from, line.to)
          );
          continue;
        }

        // リストアイテム（順序なし、順序付き）
        const listMatch = lineText.match(/^(\s*)([-*+]|\d+\.)\s+(.+)$/);
        if (listMatch) {
          const indent = Math.floor(listMatch[1].length / 2);
          const marker = listMatch[2];
          const text = listMatch[3];
          
          replaceDecorations.push(
            Decoration.replace({
              widget: new ListItemWidget(text, indent, marker),
            }).range(line.from, line.to)
          );
          continue;
        }

        // 空行の場合はスキップ
        if (lineText.trim().length === 0) {
          continue;
        }

        // 通常の段落行のインライン要素を処理
        this.processInlineElements(line, lineText, markDecorations, replaceDecorations);
      }

      // 各種デコレーションを結合してソート
      const allDecorations = [
        ...markDecorations,
        ...lineDecorations,
        ...replaceDecorations
      ].sort((a, b) => {
        // fromでソート
        if (a.from !== b.from) return a.from - b.from;
        // toでソート
        if (a.to !== b.to) return a.to - b.to;
        // 同じ位置の場合は、widgetを最後に
        const aIsWidget = a.value && 'widget' in a.value;
        const bIsWidget = b.value && 'widget' in b.value;
        if (aIsWidget && !bIsWidget) return 1;
        if (!aIsWidget && bIsWidget) return -1;
        return 0;
      });
      
      return Decoration.set(allDecorations);
    }

    processInlineElements(line: any, lineText: string, markDecorations: any[], replaceDecorations: any[]) {
      // マッチした範囲を記録して重複を避ける
      const matched: { from: number; to: number }[] = [];

      const isOverlapping = (start: number, end: number) => {
        return matched.some(m => 
          (start >= m.from && start < m.to) || 
          (end > m.from && end <= m.to) ||
          (start <= m.from && end >= m.to)
        );
      };

      // 1. 画像 ![alt](url) - 最優先
      const imagePattern = /!\[([^\]]*)\]\(([^)]+)\)/g;
      let match;
      while ((match = imagePattern.exec(lineText)) !== null) {
        const start = line.from + match.index;
        const end = start + match[0].length;
        
        if (!isOverlapping(start, end)) {
          replaceDecorations.push(
            Decoration.replace({
              widget: new ImageWidget(match[1], match[2]),
            }).range(start, end)
          );
          matched.push({ from: start, to: end });
        }
      }

      // 2. 通常のリンク [text](url)
      const linkPattern = /(?<!!)\[([^\]]+)\]\(([^)]+)\)/g;
      while ((match = linkPattern.exec(lineText)) !== null) {
        const start = line.from + match.index;
        const end = start + match[0].length;
        
        if (!isOverlapping(start, end)) {
          replaceDecorations.push(
            Decoration.replace({
              widget: new LinkWidget(match[1], match[2]),
            }).range(start, end)
          );
          matched.push({ from: start, to: end });
        }
      }

      // 3. Wikiリンク [[text]]
      const wikiLinkPattern = /\[\[([^\]]+)\]\]/g;
      while ((match = wikiLinkPattern.exec(lineText)) !== null) {
        const start = line.from + match.index;
        const end = start + match[0].length;
        
        if (!isOverlapping(start, end)) {
          replaceDecorations.push(
            Decoration.replace({
              widget: new WikiLinkWidget(match[1]),
            }).range(start, end)
          );
          matched.push({ from: start, to: end });
        }
      }

      // 4. インラインコード `code`
      const inlineCodePattern = /`([^`]+)`/g;
      while ((match = inlineCodePattern.exec(lineText)) !== null) {
        const start = line.from + match.index;
        const end = start + match[0].length;
        
        if (!isOverlapping(start, end)) {
          replaceDecorations.push(
            Decoration.replace({
              widget: new InlineCodeWidget(match[1]),
            }).range(start, end)
          );
          matched.push({ from: start, to: end });
        }
      }

      // 5. 太字 **text** - マーカーを隠してテキストを装飾
      const boldPattern = /\*\*([^*]+)\*\*/g;
      while ((match = boldPattern.exec(lineText)) !== null) {
        const start = line.from + match.index;
        const end = start + match[0].length;
        const textStart = start + 2;
        const textEnd = end - 2;
        
        if (!isOverlapping(start, end)) {
          replaceDecorations.push(
            Decoration.replace({
              widget: new HideWidget(),
            }).range(start, textStart)
          );
          
          markDecorations.push(
            Decoration.mark({
              class: 'cm-bold-text',
            }).range(textStart, textEnd)
          );
          
          replaceDecorations.push(
            Decoration.replace({
              widget: new HideWidget(),
            }).range(textEnd, end)
          );
          
          matched.push({ from: start, to: end });
        }
      }

      // 6. イタリック *text* または _text_
      const italicPattern = /(?<!\*)\*(?!\*)([^*]+)\*(?!\*)|(?<!_)_(?!_)([^_]+)_(?!_)/g;
      while ((match = italicPattern.exec(lineText)) !== null) {
        const start = line.from + match.index;
        const end = start + match[0].length;
        const textStart = start + 1;
        const textEnd = end - 1;
        
        if (!isOverlapping(start, end)) {
          replaceDecorations.push(
            Decoration.replace({
              widget: new HideWidget(),
            }).range(start, textStart)
          );
          
          markDecorations.push(
            Decoration.mark({
              class: 'cm-italic-text',
            }).range(textStart, textEnd)
          );
          
          replaceDecorations.push(
            Decoration.replace({
              widget: new HideWidget(),
            }).range(textEnd, end)
          );
          
          matched.push({ from: start, to: end });
        }
      }

      // 7. 打ち消し線 ~~text~~
      const strikethroughPattern = /~~([^~]+)~~/g;
      while ((match = strikethroughPattern.exec(lineText)) !== null) {
        const start = line.from + match.index;
        const end = start + match[0].length;
        const textStart = start + 2;
        const textEnd = end - 2;
        
        if (!isOverlapping(start, end)) {
          replaceDecorations.push(
            Decoration.replace({
              widget: new HideWidget(),
            }).range(start, textStart)
          );
          
          markDecorations.push(
            Decoration.mark({
              class: 'cm-strikethrough-text',
            }).range(textStart, textEnd)
          );
          
          replaceDecorations.push(
            Decoration.replace({
              widget: new HideWidget(),
            }).range(textEnd, end)
          );
          
          matched.push({ from: start, to: end });
        }
      }
    }
  },
  {
    decorations: (v: { decorations: DecorationSet }) => v.decorations,
  }
);

// カスタムハイライトスタイル
const customHighlight = HighlightStyle.define([
  { tag: tags.heading1, fontSize: '1.9em', fontWeight: 'bold', color: '#dcddde' },
  { tag: tags.heading2, fontSize: '1.65em', fontWeight: 'bold', color: '#dcddde' },
  { tag: tags.heading3, fontSize: '1.4em', fontWeight: 'bold', color: '#dcddde' },
  { tag: tags.heading4, fontSize: '1.2em', fontWeight: 'bold', color: '#d4d4d4' },
  { tag: tags.heading5, fontSize: '1.08em', fontWeight: 'bold', color: '#d4d4d4' },
  { tag: tags.heading6, fontSize: '1em', fontWeight: 'bold', color: '#cecece' },
  { tag: tags.strong, fontWeight: 'bold', color: '#dcddde' },
  { tag: tags.emphasis, fontStyle: 'italic', color: '#b5bcc7' },
  { tag: tags.link, color: '#4fc3f7', textDecoration: 'underline' },
  { tag: tags.monospace, fontFamily: '"Fira Code", "JetBrains Mono", Consolas, monospace', backgroundColor: 'rgba(0,0,0,0.3)', padding: '2px 4px', borderRadius: '3px', color: '#abb2bf', fontSize: '0.92em' },
]);

export function CodeMirrorEditor({ value, onChange }: CodeMirrorEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);

  // onChangeの最新値を保持
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!editorRef.current) return;

    const extensions: Extension[] = [
      highlightActiveLine(),
      history(),
      markdown(),
      syntaxHighlighting(customHighlight),
      livePreviewPlugin,
      keymap.of([...defaultKeymap, ...historyKeymap]),
      EditorView.lineWrapping,
      EditorView.updateListener.of((update: ViewUpdate) => {
        if (update.docChanged) {
          onChangeRef.current(update.state.doc.toString());
        }
      }),
      EditorView.theme({
        '&': { 
          height: '100%', 
          fontSize: '15px',
          backgroundColor: '#1e1e1e',
        },
        '.cm-scroller': { 
          overflow: 'auto', 
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif',
          lineHeight: '1.6',
        },
        '.cm-content': { 
          padding: '20px 32px 40px 32px',
          lineHeight: '1.6',
          color: '#dcddde',
          caretColor: '#4fc3f7',
        },
        '.cm-line': {
          padding: '0',
        },
        '.cm-activeLine': {
          backgroundColor: 'rgba(255, 255, 255, 0.02)',
        },
        '.cm-cursor': {
          borderLeftColor: '#4fc3f7',
          borderLeftWidth: '2px',
        },
        '.cm-code-block-line': {
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          fontFamily: '"Fira Code", "JetBrains Mono", Consolas, Monaco, monospace',
          fontSize: '13px',
        },
        '.cm-syntax-keyword': {
          color: '#c678dd !important',
          fontWeight: '500',
        },
        '.cm-syntax-string': {
          color: '#98c379 !important',
        },
        '.cm-syntax-comment': {
          color: '#5c6370 !important',
          fontStyle: 'italic',
        },
        '.cm-syntax-number': {
          color: '#d19a66 !important',
        },
        '.cm-syntax-function': {
          color: '#61afef !important',
        },
        '.cm-syntax-tag': {
          color: '#e06c75 !important',
        },
        '.cm-syntax-attribute': {
          color: '#d19a66 !important',
        },
        '.cm-syntax-selector': {
          color: '#e06c75 !important',
        },
        '.cm-syntax-property': {
          color: '#d19a66 !important',
        },
        '.cm-syntax-value': {
          color: '#98c379 !important',
        },
        '.cm-bold-text': {
          fontWeight: '600',
          color: '#dcddde',
        },
        '.cm-italic-text': {
          fontStyle: 'italic',
          color: '#dcddde',
        },
        '.cm-strikethrough-text': {
          textDecoration: 'line-through',
          opacity: '0.6',
          color: '#9ca3af',
        },
      }),
    ];

    const startState = EditorState.create({
      doc: value,
      extensions,
    });

    const view = new EditorView({
      state: startState,
      parent: editorRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []); // エディタは一度だけ初期化

  // 外部からのvalue変更時にエディタを更新（カーソル位置を保持）
  useEffect(() => {
    if (viewRef.current) {
      const currentValue = viewRef.current.state.doc.toString();
      if (currentValue !== value) {
        viewRef.current.dispatch({
          changes: { from: 0, to: currentValue.length, insert: value },
        });
      }
    }
  }, [value]);

  return <div ref={editorRef} style={{ height: '100%', width: '100%' }} />;
}
