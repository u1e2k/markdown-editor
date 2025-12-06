import { useEffect, useRef } from 'react';
import { EditorState, Extension } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLine, Decoration, DecorationSet, ViewPlugin, ViewUpdate, WidgetType } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
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
    heading.style.margin = '0.5em 0';
    heading.style.fontWeight = 'bold';
    heading.style.fontSize = `${2.2 - this.level * 0.2}em`;
    heading.style.color = '#e0e0e0';
    return heading;
  }
}

// カスタムウィジェット: 太字のレンダリング
class BoldWidget extends WidgetType {
  constructor(readonly text: string) {
    super();
  }

  toDOM() {
    const span = document.createElement('span');
    span.textContent = this.text;
    span.style.fontWeight = 'bold';
    span.style.color = '#e0e0e0';
    return span;
  }
}

// カスタムウィジェット: イタリックのレンダリング
class ItalicWidget extends WidgetType {
  constructor(readonly text: string) {
    super();
  }

  toDOM() {
    const span = document.createElement('span');
    span.textContent = this.text;
    span.style.fontStyle = 'italic';
    span.style.color = '#e0e0e0';
    return span;
  }
}

// カスタムウィジェット: Wikiリンクのレンダリング
class WikiLinkWidget extends WidgetType {
  constructor(readonly text: string) {
    super();
  }

  toDOM() {
    const link = document.createElement('span');
    link.textContent = this.text;
    link.style.color = '#4fc3f7';
    link.style.textDecoration = 'underline';
    link.style.cursor = 'pointer';
    return link;
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

      for (let lineNum = 1; lineNum <= view.state.doc.lines; lineNum++) {
        // カーソルがある行はスキップ（編集モード）
        if (lineNum === cursorLine) continue;

        const line = view.state.doc.line(lineNum);
        const lineText = line.text;

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

        // 太字 **text**
        const boldPattern = /\*\*([^*]+)\*\*/g;
        let match;
        let lastIndex = 0;
        const lineDecorations: any[] = [];

        while ((match = boldPattern.exec(lineText)) !== null) {
          const start = line.from + match.index;
          const end = start + match[0].length;
          lineDecorations.push(
            Decoration.replace({
              widget: new BoldWidget(match[1]),
            }).range(start, end)
          );
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
    decorations: (v) => v.decorations,
  }
);

// カスタムハイライトスタイル
const customHighlight = HighlightStyle.define([
  { tag: tags.heading1, fontSize: '2em', fontWeight: 'bold', color: '#e0e0e0' },
  { tag: tags.heading2, fontSize: '1.8em', fontWeight: 'bold', color: '#e0e0e0' },
  { tag: tags.heading3, fontSize: '1.6em', fontWeight: 'bold', color: '#e0e0e0' },
  { tag: tags.heading4, fontSize: '1.4em', fontWeight: 'bold', color: '#e0e0e0' },
  { tag: tags.heading5, fontSize: '1.2em', fontWeight: 'bold', color: '#e0e0e0' },
  { tag: tags.heading6, fontSize: '1.1em', fontWeight: 'bold', color: '#e0e0e0' },
  { tag: tags.strong, fontWeight: 'bold', color: '#e0e0e0' },
  { tag: tags.emphasis, fontStyle: 'italic', color: '#e0e0e0' },
  { tag: tags.link, color: '#4fc3f7', textDecoration: 'underline' },
  { tag: tags.monospace, fontFamily: 'monospace', backgroundColor: '#333' },
]);

export function CodeMirrorEditor({ value, onChange }: CodeMirrorEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  useEffect(() => {
    if (!editorRef.current) return;

    const extensions: Extension[] = [
      lineNumbers(),
      highlightActiveLine(),
      history(),
      markdown(),
      oneDark,
      syntaxHighlighting(customHighlight),
      livePreviewPlugin,
      keymap.of([...defaultKeymap, ...historyKeymap]),
      EditorView.lineWrapping,
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          onChange(update.state.doc.toString());
        }
      }),
      EditorView.theme({
        '&': { height: '100%' },
        '.cm-scroller': { overflow: 'auto', fontFamily: 'monospace' },
        '.cm-content': { padding: '20px' },
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
    };
  }, []);

  // 外部からvalueが変更された時の処理
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
