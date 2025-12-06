import { create } from 'zustand';
import axios from 'axios';

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
      set({ error: 'Failed to fetch notes', loading: false });
    }
  },

  fetchNote: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const response = await axios.get(`${API_BASE}/notes/${id}`);
      set({ currentNote: response.data, loading: false });
    } catch (error) {
      set({ error: 'Failed to fetch note', loading: false });
    }
  },

  createNote: async (title: string, content: string) => {
    set({ loading: true, error: null });
    try {
      const response = await axios.post(`${API_BASE}/notes`, { title, content });
      const newNote = response.data;
      set(state => ({ 
        notes: [...state.notes, newNote], 
        currentNote: { ...newNote, content },
        loading: false 
      }));
      return newNote;
    } catch (error) {
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
      set({ error: 'Failed to delete note', loading: false });
      throw error;
    }
  },

  setCurrentNote: (note: Note | null) => {
    set({ currentNote: note });
  },
}));
