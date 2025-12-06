import { Note } from '../store/noteStore';
import { useNoteStore } from '../store/noteStore';
import './NoteList.css';
import { useRef } from 'react';

interface NoteListProps {
  notes: Note[];
  currentNoteId?: string;
  onSelectNote: (note: Note) => void;
}

export function NoteList({ notes, currentNoteId, onSelectNote }: NoteListProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { importNotes } = useNoteStore();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      const mdFiles = Array.from(files).filter(f => f.name.endsWith('.md'));
      if (mdFiles.length === 0) {
        alert('マークダウンファイル(.md)を選択してください');
        return;
      }

      await importNotes(mdFiles);
      alert(`${mdFiles.length}件のノートをインポートしました`);
      
      // ファイル入力をリセット
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Import error:', error);
      alert('インポートに失敗しました');
    }
  };

  return (
    <div className="note-list">
      <div className="note-list-header">
        <button className="import-button" onClick={handleImportClick}>
          📥 インポート
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".md"
          multiple
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </div>
      <div className="note-list-content">
        {notes.length === 0 ? (
          <div className="empty-list">
            <p>ノートがありません</p>
          </div>
        ) : (
          notes.map(note => (
            <div
              key={note.id}
              className={`note-item ${note.id === currentNoteId ? 'active' : ''}`}
              onClick={() => onSelectNote(note)}
            >
              <div className="note-title">{note.title}</div>
              <div className="note-date">{formatDate(note.updatedAt)}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
