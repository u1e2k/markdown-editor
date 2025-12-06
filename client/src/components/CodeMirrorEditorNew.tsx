import { useEffect, useRef } from 'react';
import { EditorState, Extension } from '@codemirror/state';
import { EditorView, keymap, highlightActiveLine, ViewUpdate } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import { syntaxHighlighting } from '@codemirror/language';

// 分割したモジュールからインポート
import { customHighlight, editorTheme } from './codemirror/theme';
import { livePreviewPlugin } from './codemirror/livePreviewPlugin';

interface CodeMirrorEditorProps {
  value: string;
  onChange: (value: string) => void;
}

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
      editorTheme,
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
