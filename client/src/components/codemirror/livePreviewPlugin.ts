import { EditorView, Decoration, DecorationSet, ViewPlugin, ViewUpdate } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';
import {
    HideWidget,
    WikiLinkWidget,
    InlineCodeWidget,
    LinkWidget,
    ImageWidget,
    HeadingWidget,
    ListItemWidget,
    BlockquoteWidget,
    TaskListWidget,
    HorizontalRuleWidget,
    CodeBlockHeaderWidget,
} from './widgets';

// シンタックスハイライト用の範囲を取得
function getHighlightRanges(text: string, lang: string): { from: number; to: number; class: string }[] {
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
    } else {
        // 言語未指定時のデフォルトハイライト（汎用的なパターン）
        console.log('[getHighlightRanges] Using default patterns for unspecified language');
        patterns.push(
            { pattern: /"([^"\\]|\\.)*"|'([^'\\]|\\.)*'|`([^`\\]|\\.)*`/g, className: 'cm-syntax-string' },
            { pattern: /\/\/.*$/gm, className: 'cm-syntax-comment' },
            { pattern: /\/\*[\s\S]*?\*\//g, className: 'cm-syntax-comment' },
            { pattern: /#.*$/gm, className: 'cm-syntax-comment' },
            { pattern: /\b\d+\.?\d*\b/g, className: 'cm-syntax-number' },
            { pattern: /\b(function|return|if|else|for|while|class|def|const|let|var|import|export|from|true|false|null|undefined|None|True|False)\b/g, className: 'cm-syntax-keyword' }
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

// インライン要素を処理
function processInlineElements(
    line: { from: number; to: number; text: string },
    lineText: string,
    markDecorations: any[],
    replaceDecorations: any[]
) {
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

// デコレーションをビルド
function buildDecorations(view: EditorView): DecorationSet {
    const markDecorations: any[] = [];  // Decoration.mark
    const lineDecorations: any[] = [];  // Decoration.line
    const replaceDecorations: any[] = []; // Decoration.replace
    const cursorLine = view.state.doc.lineAt(view.state.selection.main.head).number;

    // コードブロックの範囲を記録するセット（行番号ベースで重複処理を避けるため）
    const codeBlockRanges = new Set<number>();

    // 1. Syntax Treeを使ってコードブロック(FencedCode)を正確に検出
    // (syntaxTreeは冒頭でimport済み)

    syntaxTree(view.state).iterate({
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        enter: (node: any) => {
            if (node.name === 'FencedCode') {
                const fromLine = view.state.doc.lineAt(node.from);
                const toLine = view.state.doc.lineAt(node.to);

                // 言語名の取得（CodeInfoノードから）
                let language = '';
                let infoNode = node.node.firstChild;
                while (infoNode) {
                    if (infoNode.name === 'CodeInfo') {
                        language = view.state.sliceDoc(infoNode.from, infoNode.to);
                        break;
                    }
                    infoNode = infoNode.nextSibling;
                }

                // コードブロック内の行を処理
                for (let i = fromLine.number; i <= toLine.number; i++) {
                    codeBlockRanges.add(i);
                    const line = view.state.doc.line(i);
                    const lineText = line.text;
                    const isCursorLine = i === cursorLine;

                    // 開始行（```lang）
                    if (i === fromLine.number) {
                        if (isCursorLine) continue; // 編集時はそのまま

                        replaceDecorations.push(
                            Decoration.replace({
                                widget: new HideWidget(),
                            }).range(line.from, line.to)
                        );
                    }
                    // 終了行（```）
                    else if (i === toLine.number) {
                        if (isCursorLine) continue; // 編集時はそのまま

                        replaceDecorations.push(
                            Decoration.replace({
                                widget: new HideWidget(),
                            }).range(line.from, line.to)
                        );
                    }
                    // 本文行
                    else {
                        const lineAttrs: any = {
                            class: 'cm-code-block-line'
                        };

                        // 本文1行目の場合、属性を追加してCSSでヘッダーを表示させる
                        if (i === fromLine.number + 1 && language) {
                            lineAttrs['data-code-block-first-line'] = 'true';
                            lineAttrs['data-language'] = language;
                        }

                        // 背景色（カーソル行でも適用）
                        lineDecorations.push(
                            Decoration.line({
                                attributes: lineAttrs
                            }).range(line.from)
                        );

                        // シンタックスハイライト
                        const highlights = getHighlightRanges(lineText, language);
                        for (const hl of highlights) {
                            markDecorations.push(
                                Decoration.mark({
                                    class: hl.class,
                                }).range(line.from + hl.from, line.from + hl.to)
                            );
                        }
                    }
                }
                return false; // 子ノードの走査は不要
            }
        }
    });

    // 2. その他のMarkdown要素を行ごとに処理（コードブロック以外）
    for (let lineNum = 1; lineNum <= view.state.doc.lines; lineNum++) {
        // コードブロック内の行はスキップ
        if (codeBlockRanges.has(lineNum)) continue;

        const isCursorLine = lineNum === cursorLine;
        const line = view.state.doc.line(lineNum);
        const lineText = line.text;

        // カーソルがある行のブロックレベル置換はスキップ
        if (isCursorLine) {
            // インライン要素の処理だけは行うか？ -> いや、編集モードではプレーンに見せるのが基本
            // ただし、もしインライン装飾を編集時も見せたいならここで処理するが、
            // 既存ロジックに合わせてスキップする。
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
        processInlineElements(line, lineText, markDecorations, replaceDecorations);
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

// ライブプレビュープラグイン
export const livePreviewPlugin = ViewPlugin.fromClass(
    class {
        decorations: DecorationSet;

        constructor(view: EditorView) {
            this.decorations = buildDecorations(view);
        }

        update(update: ViewUpdate) {
            if (update.docChanged || update.selectionSet || update.viewportChanged) {
                this.decorations = buildDecorations(update.view);
            }
        }
    },
    {
        decorations: (v: { decorations: DecorationSet }) => v.decorations,
    }
);
