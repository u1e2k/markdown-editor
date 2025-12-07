import { HighlightStyle } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import { EditorView } from '@codemirror/view';

// カスタムハイライトスタイル
export const customHighlight = HighlightStyle.define([
    { tag: tags.heading1, fontSize: '1.9em', fontWeight: 'bold', color: '#dcddde' },
    { tag: tags.heading2, fontSize: '1.65em', fontWeight: 'bold', color: '#dcddde' },
    { tag: tags.heading3, fontSize: '1.4em', fontWeight: 'bold', color: '#dcddde' },
    { tag: tags.heading4, fontSize: '1.2em', fontWeight: 'bold', color: '#d4d4d4' },
    { tag: tags.heading5, fontSize: '1.08em', fontWeight: 'bold', color: '#d4d4d4' },
    { tag: tags.heading6, fontSize: '1em', fontWeight: 'bold', color: '#cecece' },
    { tag: tags.strong, fontWeight: 'bold', color: '#dcddde' },
    { tag: tags.emphasis, fontStyle: 'italic', color: '#b5bcc7' },
    { tag: tags.link, color: '#4fc3f7', textDecoration: 'underline' },
    { tag: tags.monospace, fontFamily: '"Fira Code", "JetBrains Mono", Consolas, monospace', padding: '2px 4px', borderRadius: '3px', fontSize: '0.92em' },
]);

// エディタテーマ
export const editorTheme = EditorView.theme({
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
        backgroundColor: 'rgba(40, 42, 54, 0.8)',
        fontFamily: '"Fira Code", "JetBrains Mono", Consolas, Monaco, monospace',
        fontSize: '14px',
        padding: '0 8px',
        position: 'relative',
    },
    '.cm-code-block-line[data-code-block-first-line="true"]': {
        marginTop: '20px',
    },
    '.cm-code-block-line[data-code-block-first-line="true"]::before': {
        content: 'attr(data-language)',
        position: 'absolute',
        top: '-20px',
        right: '0',
        left: '0',
        height: '20px',
        backgroundColor: 'rgba(40, 42, 54, 0.8)',
        color: '#8be9fd',
        fontSize: '12px',
        fontWeight: 'bold',
        lineHeight: '20px',
        padding: '0 8px',
        borderTopLeftRadius: '6px',
        borderTopRightRadius: '6px',
        textAlign: 'right',
        pointerEvents: 'none',
        zIndex: '1',
    },
    // シンタックスハイライト用スタイル - 特異性を上げて.cm-contentを上書き
    '.cm-content .cm-syntax-keyword': {
        color: '#ff79c6 !important',
        fontWeight: '600',
    },
    '.cm-content .cm-syntax-string': {
        color: '#f1fa8c !important',
    },
    '.cm-content .cm-syntax-comment': {
        color: '#6272a4 !important',
        fontStyle: 'italic',
    },
    '.cm-content .cm-syntax-number': {
        color: '#bd93f9 !important',
    },
    '.cm-content .cm-syntax-function': {
        color: '#50fa7b !important',
        fontWeight: '500',
    },
    '.cm-content .cm-syntax-tag': {
        color: '#ff79c6 !important',
    },
    '.cm-content .cm-syntax-attribute': {
        color: '#50fa7b !important',
    },
    '.cm-content .cm-syntax-selector': {
        color: '#ff79c6 !important',
    },
    '.cm-content .cm-syntax-property': {
        color: '#8be9fd !important',
    },
    '.cm-content .cm-syntax-value': {
        color: '#f1fa8c !important',
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
});
