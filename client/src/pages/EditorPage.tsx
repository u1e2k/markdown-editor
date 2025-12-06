import { useEffect, useState } from 'react';
import { useNoteStore, Note } from '../store/noteStore';
import { NoteList } from '../components/NoteList';
import { Editor } from '../components/Editor';
import { GraphPage } from './GraphPage';
import './EditorPage.css';

export function EditorPage() {
  const { notes, currentNote, fetchNotes, createNote, fetchNote } = useNoteStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showGraph, setShowGraph] = useState(() => {
    const saved = localStorage.getItem('showGraphView');
    return saved === 'true';
  });

  useEffect(() => {
    const loadNotes = async () => {
      await fetchNotes();
      
      // 最後に開いていたノートを復元
      const lastNoteId = localStorage.getItem('lastOpenedNoteId');
      if (lastNoteId) {
        await fetchNote(lastNoteId);
      }
    };
    
    loadNotes();
  }, [fetchNotes, fetchNote]);

  // currentNoteが変更されたらlocalStorageに保存
  useEffect(() => {
    if (currentNote) {
      localStorage.setItem('lastOpenedNoteId', currentNote.id);
    }
  }, [currentNote]);

  // showGraphが変更されたらlocalStorageに保存
  useEffect(() => {
    localStorage.setItem('showGraphView', showGraph.toString());
  }, [showGraph]);

  const handleCreateNote = async () => {
    try {
      const now = new Date();
      const defaultTitle = `無題のノート ${now.toLocaleString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
      const today = now.toISOString().split('T')[0]; // YYYY-MM-DD形式
      
      // frontmatterを含むコンテンツを作成
      const initialContent = `---
created: ${today}
updated: ${today}
---

`;
      
      console.log('Creating note with content:', initialContent);
      const newNote = await createNote(defaultTitle, initialContent);
      console.log('Created note:', newNote);
      
      // 作成したノートを開く（contentを取得するため）
      // fetchNoteの完了を待ってから次に進む
      if (newNote && newNote.id) {
        console.log('Fetching note content...');
        await fetchNote(newNote.id);
        console.log('Note fetched successfully');
      }
    } catch (error) {
      console.error('Failed to create note:', error);
      alert('ノートの作成に失敗しました。');
    }
  };

  const handleSelectNote = async (note: Note) => {
    await fetchNote(note.id);
  };

  return (
    <div className="editor-page">
      <div className={`sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <h2>ノート一覧</h2>
          <div className="sidebar-actions">
            <button onClick={handleCreateNote} className="create-button">
              + 新規作成
            </button>
            <button 
              onClick={() => setShowGraph(!showGraph)} 
              className={`graph-toggle-button ${showGraph ? 'active' : ''}`}
              title={showGraph ? 'グラフを非表示' : 'グラフを表示'}
            >
              {showGraph ? '📝' : '🔗'}
            </button>
          </div>
        </div>
        <NoteList
          notes={notes}
          currentNoteId={currentNote?.id}
          onSelectNote={handleSelectNote}
        />
      </div>
      <button 
        className="sidebar-toggle"
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
      >
        {isSidebarOpen ? '◀' : '▶'}
      </button>
      <div className={`main-content ${showGraph ? 'split' : 'full'}`}>
        <div className="editor-container">
          {currentNote ? (
            <Editor note={currentNote} />
          ) : (
            <div className="empty-state">
              <p>ノートを選択するか、新しいノートを作成してください</p>
            </div>
          )}
        </div>
        {showGraph && (
          <div className="graph-container">
            <GraphPage />
          </div>
        )}
      </div>
    </div>
  );
}
