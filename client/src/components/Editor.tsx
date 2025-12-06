import { useState, useEffect, useCallback } from 'react';
import { CodeMirrorEditor } from './CodeMirrorEditor';
import { PropertyEditor } from './PropertyEditor';
import { Note } from '../store/noteStore';
import { useNoteStore } from '../store/noteStore';
import { parseFrontmatter, stringifyFrontmatter, Frontmatter } from '../utils/frontmatter';
import './Editor.css';

interface EditorProps {
  note: Note;
}

export function Editor({ note }: EditorProps) {
  const [content, setContent] = useState(note.content || '');
  const [title, setTitle] = useState(note.title);
  const [frontmatter, setFrontmatter] = useState<Frontmatter>({});
  const [bodyContent, setBodyContent] = useState('');
  const { updateNote, deleteNote } = useNoteStore();
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');

  // ノートが変わったら、frontmatterとbodyに分解
  useEffect(() => {
    const parsed = parseFrontmatter(note.content || '');
    setFrontmatter(parsed.frontmatter);
    setBodyContent(parsed.body);
    setContent(note.content || '');
    setTitle(note.title);
  }, [note.id, note.content]);

  // frontmatterまたはbodyが変わったら、contentを再構築
  const updateContent = useCallback((newFrontmatter: Frontmatter, newBody: string) => {
    const newContent = stringifyFrontmatter(newFrontmatter, newBody);
    setContent(newContent);
  }, []);

  const handleFrontmatterChange = (newFrontmatter: Frontmatter) => {
    // updated日付を現在の日付に自動更新
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD形式
    const updatedFrontmatter = {
      ...newFrontmatter,
      updated: today,
    };
    setFrontmatter(updatedFrontmatter);
    updateContent(updatedFrontmatter, bodyContent);
  };

  const handleBodyChange = (newBody: string) => {
    // updated日付を現在の日付に自動更新
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD形式
    const updatedFrontmatter = {
      ...frontmatter,
      updated: today,
    };
    setFrontmatter(updatedFrontmatter);
    setBodyContent(newBody);
    updateContent(updatedFrontmatter, newBody);
  };

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
      <PropertyEditor
        frontmatter={frontmatter}
        onChange={handleFrontmatterChange}
      />
      <div className="editor-body">
        <CodeMirrorEditor
          value={bodyContent}
          onChange={handleBodyChange}
        />
      </div>
    </div>
  );
}
