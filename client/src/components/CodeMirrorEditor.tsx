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

// カスタムウィジェット: 見出しのレンダリング
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

// カスタムウィジェット: 太字のレンダリング（開始マーカーを隠す）
class BoldStartWidget extends WidgetType {
  toDOM() {
    return document.createTextNode('');
  }
  
  ignoreEvent() { return false; }
}

// カスタムウィジェット: 太字のレンダリング（終了マーカーを隠す）
class BoldEndWidget extends WidgetType {
  toDOM() {
    return document.createTextNode('');
  }
  
  ignoreEvent() { return false; }
}

// カスタムウィジェット: イタリックのレンダリング（開始マーカーを隠す）
class ItalicStartWidget extends WidgetType {
  toDOM() {
    return document.createTextNode('');
  }
  
  ignoreEvent() { return false; }
}

// カスタムウィジェット: イタリックのレンダリング（終了マーカーを隠す）
class ItalicEndWidget extends WidgetType {
  toDOM() {
    return document.createTextNode('');
  }
  
  ignoreEvent() { return false; }
}

// カスタムウィジェット: Wikiリンクのレンダリング
class WikiLinkWidget extends WidgetType {
  constructor(readonly text: string) {
    super();
  }

  toDOM() {
    const link = document.createElement('span');
    link.textContent = this.text;
    link.style.color = '#7f8c8d';
    link.style.cursor = 'pointer';
    return link;
  }
}

// カスタムウィジェット: インラインコードのレンダリング
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

// カスタムウィジェット: リストアイテムのレンダリング
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

// カスタムウィジェット: 引用ブロックのレンダリング
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

// カスタムウィジェット: 水平線のレンダリング
class HorizontalRuleWidget extends WidgetType {
  toDOM() {
    const hr = document.createElement('hr');
    hr.style.border = 'none';
    hr.style.borderTop = '1px solid rgba(127, 140, 141, 0.2)';
    hr.style.margin = '0';
    hr.style.padding = '0';
    hr.style.height = '0';
    hr.style.lineHeight = '1.5';
    return hr;
  }
}

// カスタムウィジェット: タスクリストのレンダリング
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
    checkbox.style.marginTop = '0';
    checkbox.style.marginBottom = '0';
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

// カスタムウィジェット: 通常のリンクのレンダリング
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

// カスタムウィジェット: 画像のレンダリング
class ImageWidget extends WidgetType {
  constructor(readonly alt: string, readonly url: string) {
    super();
  }

  toDOM() {
    const container = document.createElement('div');
    container.style.margin = '0';
    container.style.textAlign = 'center';
    container.style.lineHeight = '0';
    
    const img = document.createElement('img');
    img.src = this.url;
    img.alt = this.alt;
    img.style.maxWidth = '100%';
    img.style.borderRadius = '6px';
    img.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
    img.style.verticalAlign = 'middle';
    
    container.appendChild(img);
    return container;
  }
}

// カスタムウィジェット: 打ち消し線のレンダリング
class StrikethroughWidget extends WidgetType {
  constructor(readonly text: string) {
    super();
  }

  toDOM() {
    const span = document.createElement('span');
    span.textContent = this.text;
    span.style.textDecoration = 'line-through';
    span.style.opacity = '0.5';
    return span;
  }
}

// カスタムウィジェット: 空行（段落区切り）のレンダリング
class ParagraphSpacingWidget extends WidgetType {
  toDOM() {
    const div = document.createElement('div');
    div.style.height = '0';
    div.style.lineHeight = '1.5';
    div.style.margin = '0';
    div.style.padding = '0';
    div.textContent = '\u200B'; // ゼロ幅スペース
    return div;
  }
}

// ライブプレビュー: カーソルがない行をレンダリング
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

    buildDecorations(view: EditorView): DecorationSet {
      const decorations: any[] = [];
      const cursorLine = view.state.doc.lineAt(view.state.selection.main.head).number;
      
      // コードブロックの検出
      const codeBlockLines = new Set<number>();
      let inCodeBlock = false;
      let codeBlockStartLine = 0;
      const codeBlockInfo: { start: number; end: number; lines: number[] }[] = [];
      
      for (let i = 1; i <= view.state.doc.lines; i++) {
        const line = view.state.doc.line(i);
        const lineText = line.text;
        
        if (lineText.trim().startsWith('```')) {
          if (!inCodeBlock) {
            // コードブロック開始
            inCodeBlock = true;
            codeBlockStartLine = i;
            codeBlockLines.add(i);
          } else {
            // コードブロック終了
            codeBlockLines.add(i);
            const blockLines: number[] = [];
            for (let j = codeBlockStartLine; j <= i; j++) {
              blockLines.push(j);
            }
            codeBlockInfo.push({ start: codeBlockStartLine, end: i, lines: blockLines });
            inCodeBlock = false;
          }
        } else if (inCodeBlock) {
          codeBlockLines.add(i);
        }
      }

      for (let lineNum = 1; lineNum <= view.state.doc.lines; lineNum++) {
        // カーソルがある行はスキップ（編集モード）
        if (lineNum === cursorLine) {
          continue;
        }
        
        const line = view.state.doc.line(lineNum);
        const lineText = line.text;
        
        // コードブロック内の処理
        if (codeBlockLines.has(lineNum)) {
          // カーソルがコードブロック内にある場合は、そのブロック全体をスキップ
          const blockContainsCursor = codeBlockInfo.some(
            block => cursorLine >= block.start && cursorLine <= block.end && lineNum >= block.start && lineNum <= block.end
          );
          
          if (blockContainsCursor) {
            continue;
          }
          
          const block = codeBlockInfo.find(b => lineNum >= b.start && lineNum <= b.end);
          if (block) {
            // コードブロック全体を置換ではなく、マークで装飾する
            // 背景色を適用
            decorations.push(
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
          
          decorations.push(
            Decoration.replace({
              widget: new HeadingWidget(text, level),
            }).range(line.from, line.to)
          );
          continue;
        }

        // 水平線
        if (lineText.match(/^(\*\*\*+|---+|___+)\s*$/)) {
          decorations.push(
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
          
          decorations.push(
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
          
          decorations.push(
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
          
          decorations.push(
            Decoration.replace({
              widget: new ListItemWidget(text, indent, marker),
            }).range(line.from, line.to)
          );
          continue;
        }

        // 空行でない通常の行のインライン要素を処理
        if (lineText.trim().length === 0) {
          // 空行を段落区切りとして扱う（前後の行がテキストの場合のみ）
          const prevLine = lineNum > 1 ? view.state.doc.line(lineNum - 1) : null;
          const nextLine = lineNum < view.state.doc.lines ? view.state.doc.line(lineNum + 1) : null;
          
          // 前の行と次の行が両方ともテキスト（見出しやリストではない）の場合のみスペーシングを追加
          const prevIsText = prevLine && prevLine.text.trim().length > 0 && 
                            !prevLine.text.match(/^(#{1,6}\s|>|[-*+]\s|\d+\.\s|```|---)/);
          const nextIsText = nextLine && nextLine.text.trim().length > 0 && 
                            !nextLine.text.match(/^(#{1,6}\s|>|[-*+]\s|\d+\.\s|```|---)/);
          
          if (prevIsText && nextIsText) {
            decorations.push(
              Decoration.replace({
                widget: new ParagraphSpacingWidget(),
              }).range(line.from, line.to)
            );
          }
          continue;
        }

        // インライン要素の処理
        const lineDecorations: any[] = [];

        // 画像 ![alt](url)
        const imagePattern = /!\[([^\]]*)\]\(([^)]+)\)/g;
        let match;
        while ((match = imagePattern.exec(lineText)) !== null) {
          const start = line.from + match.index;
          const end = start + match[0].length;
          lineDecorations.push(
            Decoration.replace({
              widget: new ImageWidget(match[1], match[2]),
            }).range(start, end)
          );
        }

        // 通常のリンク [text](url)
        const linkPattern = /(?<!!)\[([^\]]+)\]\(([^)]+)\)/g;
        while ((match = linkPattern.exec(lineText)) !== null) {
          const start = line.from + match.index;
          const end = start + match[0].length;
          // 画像とかぶらないようにチェック
          const overlaps = lineDecorations.some(d => 
            (start >= d.from && start < d.to) || (end > d.from && end <= d.to)
          );
          if (!overlaps) {
            lineDecorations.push(
              Decoration.replace({
                widget: new LinkWidget(match[1], match[2]),
              }).range(start, end)
            );
          }
        }

        // インラインコード `code`
        const inlineCodePattern = /`([^`]+)`/g;

        while ((match = inlineCodePattern.exec(lineText)) !== null) {
          const start = line.from + match.index;
          const end = start + match[0].length;
          // 既存の装飾とかぶらないようにチェック
          const overlaps = lineDecorations.some(d => 
            (start >= d.from && start < d.to) || (end > d.from && end <= d.to)
          );
          if (!overlaps) {
            lineDecorations.push(
              Decoration.replace({
                widget: new InlineCodeWidget(match[1]),
              }).range(start, end)
            );
          }
        }

        // 打ち消し線 ~~text~~
        const strikethroughPattern = /~~([^~]+)~~/g;
        while ((match = strikethroughPattern.exec(lineText)) !== null) {
          const start = line.from + match.index;
          const end = start + match[0].length;
          const overlaps = lineDecorations.some(d => 
            (start >= d.from && start < d.to) || (end > d.from && end <= d.to)
          );
          if (!overlaps) {
            lineDecorations.push(
              Decoration.replace({
                widget: new StrikethroughWidget(match[1]),
              }).range(start, end)
            );
          }
        }

        // 太字 **text**
        const boldPattern = /\*\*([^*]+)\*\*/g;

        while ((match = boldPattern.exec(lineText)) !== null) {
          const start = line.from + match.index;
          const end = start + match[0].length;
          // 既存の装飾とかぶらないようにチェック
          const overlaps = lineDecorations.some(d => 
            (start >= d.from && start < d.to) || (end > d.from && end <= d.to)
          );
          if (!overlaps) {
            lineDecorations.push(
              Decoration.replace({
                widget: new BoldWidget(match[1]),
              }).range(start, end)
            );
          }
        }

        // イタリック *text*
        const italicPattern = /(?<!\*)\*(?!\*)([^*]+)\*(?!\*)/g;
        while ((match = italicPattern.exec(lineText)) !== null) {
          const start = line.from + match.index;
          const end = start + match[0].length;
          // 太字とかぶらないようにチェック
          const overlaps = lineDecorations.some(d => 
            (start >= d.from && start < d.to) || (end > d.from && end <= d.to)
          );
          if (!overlaps) {
            lineDecorations.push(
              Decoration.replace({
                widget: new ItalicWidget(match[1]),
              }).range(start, end)
            );
          }
        }

        // Wikiリンク [[text]]
        const wikiLinkPattern = /\[\[([^\]]+)\]\]/g;
        while ((match = wikiLinkPattern.exec(lineText)) !== null) {
          const start = line.from + match.index;
          const end = start + match[0].length;
          lineDecorations.push(
            Decoration.replace({
              widget: new WikiLinkWidget(match[1]),
            }).range(start, end)
          );
        }

        decorations.push(...lineDecorations);
      }

      return Decoration.set(decorations.sort((a, b) => a.from - b.from));
    }
  },
  {
    decorations: (v: { decorations: DecorationSet }) => v.decorations,
  }
);

// カスタムハイライトスタイル
const customHighlight = HighlightStyle.define([
  { tag: tags.heading1, fontSize: '1.9em', fontWeight: 'bold', color: '#dcddde', marginTop: '0.3em', marginBottom: '0.3em' },
  { tag: tags.heading2, fontSize: '1.65em', fontWeight: 'bold', color: '#dcddde', marginTop: '0.25em', marginBottom: '0.25em' },
  { tag: tags.heading3, fontSize: '1.4em', fontWeight: 'bold', color: '#dcddde', marginTop: '0.2em', marginBottom: '0.2em' },
  { tag: tags.heading4, fontSize: '1.2em', fontWeight: 'bold', color: '#d4d4d4', marginTop: '0.15em', marginBottom: '0.15em' },
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
      // lineNumbers(), // 行番号を非表示
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
        '.cm-gutters': {
          backgroundColor: '#1e1e1e',
          borderRight: '1px solid #3e3e42',
        },
        '.cm-lineNumber': {
          color: '#6e7681',
        },
        '.cm-code-block-line': {
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          fontFamily: '"Fira Code", "JetBrains Mono", Consolas, Monaco, monospace',
          fontSize: '13px',
          color: '#abb2bf',
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
  }, []); // valueを依存配列から削除してエディタの再初期化を防ぐ

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
