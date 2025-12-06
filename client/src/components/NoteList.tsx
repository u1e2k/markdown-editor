import { Note } from '../store/noteStore';
import './NoteList.css';

interface NoteListProps {
  notes: Note[];
  currentNoteId?: string;
  onSelectNote: (note: Note) => void;
}

export function NoteList({ notes, currentNoteId, onSelectNote }: NoteListProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="note-list">
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
  );
}
