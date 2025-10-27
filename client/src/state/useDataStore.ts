// client/src/state/useDataStore.ts
import { create } from 'zustand';
import { db, Project, Task, Message, Note } from '../lib/embedded/dexie';
import { nanoid } from 'nanoid';

interface DataStore {
  // Projects
  projects: Project[];
  loadProjects: () => Promise<void>;
  createProject: (name: string, description?: string) => Promise<Project>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;

  // Tasks
  tasks: Task[];
  loadTasks: (projectId?: string) => Promise<void>;
  createTask: (projectId: string, title: string) => Promise<Task>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  toggleTask: (id: string) => Promise<void>;

  // Messages
  messages: Message[];
  loadMessages: (room: string) => Promise<void>;
  addMessage: (room: string, text: string, author: string) => Promise<Message>;

  // Notes
  notes: Note[];
  loadNotes: (projectId?: string) => Promise<void>;
  createNote: (projectId: string, title: string) => Promise<Note>;
  updateNote: (id: string, updates: Partial<Note>) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
}

export const useDataStore = create<DataStore>((set: (state: Partial<DataStore>) => void) => ({
  projects: [],
  loadProjects: async () => {
    const projects = await db.projects.toArray();
    set({ projects });
  },
  createProject: async (name: string, description?: string) => {
    const p: Project = {
      id: nanoid(),
      name,
      description,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await db.projects.add(p);
    const projects = await db.projects.toArray();
    set({ projects });
    return p;
  },
  updateProject: async (id: string, updates: Partial<Project>) => {
    await db.projects.update(id, { ...updates, updatedAt: Date.now() });
    const projects = await db.projects.toArray();
    set({ projects });
  },
  deleteProject: async (id: string) => {
    await db.projects.delete(id);
    // Cascade delete
    const tasks = await db.tasks.where('projectId').equals(id).toArray();
    for (const t of tasks) await db.tasks.delete(t.id);
    const notes = await db.notes.where('projectId').equals(id).toArray();
    for (const n of notes) await db.notes.delete(n.id);
    const projects = await db.projects.toArray();
    set({ projects });
  },

  tasks: [],
  loadTasks: async (projectId?: string) => {
    const tasks = projectId
      ? await db.tasks.where('projectId').equals(projectId).toArray()
      : await db.tasks.toArray();
    set({ tasks });
  },
  createTask: async (projectId: string, title: string) => {
    const t: Task = {
      id: nanoid(),
      projectId,
      title,
      done: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await db.tasks.add(t);
    const tasks = await db.tasks.where('projectId').equals(projectId).toArray();
    set({ tasks });
    return t;
  },
  updateTask: async (id: string, updates: Partial<Task>) => {
    await db.tasks.update(id, { ...updates, updatedAt: Date.now() });
    const tasks = await db.tasks.toArray();
    set({ tasks });
  },
  deleteTask: async (id: string) => {
    await db.tasks.delete(id);
    const tasks = await db.tasks.toArray();
    set({ tasks });
  },
  toggleTask: async (id: string) => {
    const task = await db.tasks.get(id);
    if (task) {
      await db.tasks.update(id, { done: !task.done, updatedAt: Date.now() });
      const tasks = await db.tasks.toArray();
      set({ tasks });
    }
  },

  messages: [],
  loadMessages: async (room: string) => {
    const messages = await db.messages.where('room').equals(room).limit(100).toArray();
    set({ messages });
  },
  addMessage: async (room: string, text: string, author: string) => {
    const m: Message = {
      id: nanoid(),
      room,
      text,
      author,
      ts: Date.now(),
    };
    await db.messages.add(m);
    const messages = await db.messages.where('room').equals(room).limit(100).toArray();
    set({ messages });
    return m;
  },

  notes: [],
  loadNotes: async (projectId?: string) => {
    const notes = projectId
      ? await db.notes.where('projectId').equals(projectId).toArray()
      : await db.notes.toArray();
    set({ notes });
  },
  createNote: async (projectId: string, title: string) => {
    const n: Note = {
      id: nanoid(),
      projectId,
      title,
      yjsRef: `note:${nanoid()}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await db.notes.add(n);
    const notes = await db.notes.toArray();
    set({ notes });
    return n;
  },
  updateNote: async (id: string, updates: Partial<Note>) => {
    await db.notes.update(id, { ...updates, updatedAt: Date.now() });
    const notes = await db.notes.toArray();
    set({ notes });
  },
  deleteNote: async (id: string) => {
    await db.notes.delete(id);
    const notes = await db.notes.toArray();
    set({ notes });
  },
}));
