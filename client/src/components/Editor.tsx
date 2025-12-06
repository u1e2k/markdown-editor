import { useState, useEffect, useCallback } from 'react';
import MonacoEditor from '@monaco-editor/react';
import { Note } from '../store/noteStore';
import { useNoteStore } from '../store/noteStore';
import './Editor.css';

interface EditorProps {
  note: Note;
}

export function Editor({ note }: EditorProps) {
  const [content, setContent] = useState(note.content || '');
  const [title, setTitle] = useState(note.title);
  const { updateNote, deleteNote } = useNoteStore();
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');

  useEffect(() => {
    setContent(note.content || '');
    setTitle(note.title);
  }, [note.id]);

  const handleSave = useCallback(async () => {
    setSaveStatus('saving');
    try {
      await updateNote(note.id, title, content);
      setSaveStatus('saved');
    } catch (error) {
      console.error('Failed to save note:', error);
      setSaveStatus('unsaved');
    }
  }, [note.id, title, content, updateNote]);

  const handleDelete = async () => {
    if (window.confirm('このノートを削除してもよろしいですか?')) {
      try {
        await deleteNote(note.id);
      } catch (error) {
        console.error('Failed to delete note:', error);
      }
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (content !== note.content || title !== note.title) {
        handleSave();
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [content, title, note.content, note.title, handleSave]);

  return (
    <div className="editor">
      <div className="editor-header">
        <input
          type="text"
          className="title-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="ノートのタイトル"
        />
        <div className="editor-actions">
          <span className={`save-status ${saveStatus}`}>
            {saveStatus === 'saving' && '保存中...'}
            {saveStatus === 'saved' && '保存済み'}
            {saveStatus === 'unsaved' && '未保存'}
          </span>
          <button onClick={handleSave} className="save-button">
            保存
          </button>
          <button onClick={handleDelete} className="delete-button">
            削除
          </button>
        </div>
      </div>
      <div className="editor-body">
        <MonacoEditor
          height="100%"
          language="markdown"
          theme="vs-dark"
          value={content}
          onChange={(value) => setContent(value || '')}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            wordWrap: 'on',
            padding: { top: 20, bottom: 20 },
            // Monaco Editorの検証を無効化
            'semanticHighlighting.enabled': false,
          }}
          beforeMount={(monaco) => {
            // [[リンク]]構文のカスタムトークナイザを登録
            monaco.languages.setMonarchTokensProvider('markdown', {
              tokenizer: {
                root: [
                  // Wikiリンク構文 [[...]]
                  [/\[\[[^\]]+\]\]/, 'string.link'],
                  // 通常のMarkdownトークン
                  [/^#{1,6}\s.*$/, 'keyword'],
                  [/\*\*.*?\*\*/, 'strong'],
                  [/\*.*?\*/, 'emphasis'],
                  [/`[^`]+`/, 'variable'],
                  [/\[.*?\]\(.*?\)/, 'string.link'],
                ],
              },
            } as any);
          }}
        />
      </div>
    </div>
  );
}
