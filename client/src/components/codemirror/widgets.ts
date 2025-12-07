import { WidgetType } from '@codemirror/view';

// インライン要素のマーカーを隠すウィジェット
export class HideWidget extends WidgetType {
    toDOM() {
        const span = document.createElement('span');
        span.style.display = 'none';
        return span;
    }
    ignoreEvent() { return false; }
}

// Wikiリンクのウィジェット
export class WikiLinkWidget extends WidgetType {
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
export class InlineCodeWidget extends WidgetType {
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
export class LinkWidget extends WidgetType {
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
export class ImageWidget extends WidgetType {
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
export class HeadingWidget extends WidgetType {
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
export class ListItemWidget extends WidgetType {
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
export class BlockquoteWidget extends WidgetType {
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
export class TaskListWidget extends WidgetType {
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
export class HorizontalRuleWidget extends WidgetType {
    toDOM() {
        const hr = document.createElement('hr');
        hr.style.border = 'none';
        hr.style.borderTop = '1px solid rgba(127, 140, 141, 0.2)';
        hr.style.margin = '0';
        hr.style.height = '0';
        return hr;
    }
}

// コードブロックヘッダーのウィジェット（言語名を表示）
export class CodeBlockHeaderWidget extends WidgetType {
    constructor(readonly language: string) {
        super();
    }

    toDOM() {
        const container = document.createElement('div');
        container.style.display = 'flex';
        container.style.justifyContent = 'flex-end';
        container.style.padding = '4px 8px 10px 8px'; // 下部のpaddingを増やして調整
        container.style.backgroundColor = 'rgba(40, 42, 54, 0.8)'; // theme.tsの色と統一
        container.style.borderTopLeftRadius = '6px';
        container.style.borderTopRightRadius = '6px';
        container.style.borderBottomLeftRadius = '0';
        container.style.borderBottomRightRadius = '0';
        container.style.marginBottom = '-6px'; // 下の行に食い込ませる
        container.style.position = 'relative';
        container.style.zIndex = '1';

        const label = document.createElement('span');
        label.textContent = this.language;
        label.style.fontSize = '11px';
        label.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        label.style.color = '#8be9fd';
        label.style.textTransform = 'uppercase';
        label.style.letterSpacing = '0.5px';
        label.style.fontWeight = '500';

        container.appendChild(label);
        return container;
    }
}
