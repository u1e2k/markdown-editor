import { useEffect, useState } from 'react';
import { useNoteStore } from '../store/noteStore';
import { NoteList } from '../components/NoteList';
import { Editor } from '../components/Editor';
import './EditorPage.css';

export function EditorPage() {
  const { notes, currentNote, fetchNotes, createNote, setCurrentNote } = useNoteStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const handleCreateNote = async () => {
    const title = prompt('ノートのタイトルを入力してください:');
    if (title) {
      try {
        await createNote(title, '# ' + title + '\n\n新しいノート');
      } catch (error) {
        console.error('Failed to create note:', error);
      }
    }
  };

  return (
    <div className="editor-page">
      <div className={`sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <h2>ノート一覧</h2>
          <button onClick={handleCreateNote} className="create-button">
            + 新規作成
          </button>
        </div>
        <NoteList
          notes={notes}
          currentNoteId={currentNote?.id}
          onSelectNote={setCurrentNote}
        />
      </div>
      <button 
        className="sidebar-toggle"
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
      >
        {isSidebarOpen ? '◀' : '▶'}
      </button>
      <div className="editor-container">
        {currentNote ? (
          <Editor note={currentNote} />
        ) : (
          <div className="empty-state">
            <p>ノートを選択するか、新しいノートを作成してください</p>
          </div>
        )}
      </div>
    </div>
  );
}
