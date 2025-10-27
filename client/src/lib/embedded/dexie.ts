// client/src/lib/embedded/dexie.ts
import Dexie, { Table, Collection } from 'dexie';

export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  done: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Message {
  id: string;
  room: string;
  text: string;
  author: string;
  ts: number;
}

export interface Note {
  id: string;
  projectId: string;
  title: string;
  yjsRef: string; // Reference to Yjs doc
  createdAt: number;
  updatedAt: number;
}

class CollabProDB extends Dexie {
  projects!: Table<Project, string>;
  tasks!: Table<Task, string>;
  messages!: Table<Message, string>;
  notes!: Table<Note, string>;

  constructor() {
    super('collab_pro_embedded');
    this.version(1).stores({
      projects: 'id, createdAt, updatedAt, name',
      tasks: 'id, projectId, createdAt, updatedAt, title',
      messages: 'id, room, ts, author',
      notes: 'id, projectId, createdAt, updatedAt, title',
    });
  }
}

export const db = new CollabProDB();

// Extend DB with helper methods
declare module 'dexie' {
  interface Table<T> {
    limit(n: number): Collection<T>;
  }
}

// Helpers
export const getAllProjects = (): Promise<Project[]> => db.projects.toArray();
export const getProjectById = (id: string): Promise<Project | undefined> => db.projects.get(id);
export const getTasksByProject = (projectId: string): Promise<Task[]> =>
  db.tasks.where('projectId').equals(projectId).toArray();
export const getMessagesByRoom = (room: string): Promise<Message[]> =>
  db.messages.where('room').equals(room).limit(100).toArray();
