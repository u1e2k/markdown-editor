import { create } from 'zustand';
import axios from 'axios';

// Axiosのグローバル設定
axios.defaults.timeout = 10000; // 10秒タイムアウト

// エラーレスポンスのインターセプター
axios.interceptors.response.use(
  response => response,
  error => {
    if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
      console.error('❌ API server is not running. Please start the server with: cd server && bun run dev');
    } else if (error.response) {
      console.error('❌ API Error:', error.response.status, error.response.data);
    } else if (error.request) {
      console.error('❌ No response from API server:', error.message);
    } else {
      console.error('❌ Request error:', error.message);
    }
    return Promise.reject(error);
  }
);

export interface Note {
  id: string;
  title: string;
  content?: string;
  createdAt: string;
  updatedAt: string;
}

interface NoteStore {
  notes: Note[];
  currentNote: Note | null;
  loading: boolean;
  error: string | null;
  
  fetchNotes: () => Promise<void>;
  fetchNote: (id: string) => Promise<void>;
  createNote: (title: string, content: string) => Promise<Note>;
  updateNote: (id: string, title: string, content: string) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  importNotes: (files: File[]) => Promise<void>;
  setCurrentNote: (note: Note | null) => void;
}

const API_BASE = '/api';

export const useNoteStore = create<NoteStore>((set, get) => ({
  notes: [],
  currentNote: null,
  loading: false,
  error: null,

  fetchNotes: async () => {
    set({ loading: true, error: null });
    try {
      const response = await axios.get(`${API_BASE}/notes`);
      set({ notes: response.data.notes, loading: false });
    } catch (error) {
      console.error('Failed to fetch notes:', error);
      set({ error: 'Failed to fetch notes', loading: false });
    }
  },

  fetchNote: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const response = await axios.get(`${API_BASE}/notes/${id}`);
      set({ currentNote: response.data, loading: false });
    } catch (error) {
      console.error('Failed to fetch note:', error);
      set({ error: 'Failed to fetch note', loading: false });
    }
  },

  createNote: async (title: string, content: string) => {
    set({ loading: true, error: null });
    try {
      const response = await axios.post(`${API_BASE}/notes`, { title, content });
      const newNote = response.data;
      // ノート一覧に追加するだけで、currentNoteはfetchNoteで設定する
      set(state => ({ 
        notes: [...state.notes, newNote], 
        loading: false 
      }));
      return newNote;
    } catch (error) {
      console.error('Failed to create note:', error);
      set({ error: 'Failed to create note', loading: false });
      throw error;
    }
  },

  updateNote: async (id: string, title: string, content: string) => {
    set({ loading: true, error: null });
    try {
      await axios.put(`${API_BASE}/notes/${id}`, { title, content });
      set(state => ({
        notes: state.notes.map(n => n.id === id ? { ...n, title, updatedAt: new Date().toISOString() } : n),
        currentNote: state.currentNote?.id === id ? { ...state.currentNote, title, content } : state.currentNote,
        loading: false,
      }));
    } catch (error) {
      console.error('Failed to update note:', error);
      set({ error: 'Failed to update note', loading: false });
      throw error;
    }
  },

  deleteNote: async (id: string) => {
    set({ loading: true, error: null });
    try {
      await axios.delete(`${API_BASE}/notes/${id}`);
      set(state => ({
        notes: state.notes.filter(n => n.id !== id),
        currentNote: state.currentNote?.id === id ? null : state.currentNote,
        loading: false,
      }));
    } catch (error) {
      console.error('Failed to delete note:', error);
      set({ error: 'Failed to delete note', loading: false });
      throw error;
    }
  },

  importNotes: async (files: File[]) => {
    set({ loading: true, error: null });
    try {
      // ファイルを読み込んでJSONに変換
      const filePromises = files.map(async (file) => {
        const content = await file.text();
        return {
          name: file.name,
          content: content,
        };
      });
      
      const filesData = await Promise.all(filePromises);
      
      const response = await axios.post(`${API_BASE}/notes/import`, {
        files: filesData,
      });
      
      // インポート後にノート一覧を再取得
      await get().fetchNotes();
      
      console.log(`✅ Imported ${response.data.imported} notes`);
    } catch (error) {
      console.error('Failed to import notes:', error);
      set({ error: 'Failed to import notes', loading: false });
      throw error;
    }
  },

  setCurrentNote: (note: Note | null) => {
    set({ currentNote: note });
  },
}));
