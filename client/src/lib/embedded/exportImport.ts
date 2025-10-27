// client/src/lib/embedded/exportImport.ts
import { db } from './dexie';

export interface WorkspaceSnapshot {
  version: '1.0';
  exportedAt: number;
  projects: any[];
  tasks: any[];
  messages: any[];
  notes: any[];
}

/**
 * Export workspace to JSON blob
 */
export async function exportWorkspace(): Promise<Blob> {
  const [projects, tasks, messages, notes] = await Promise.all([
    db.projects.toArray(),
    db.tasks.toArray(),
    db.messages.toArray(),
    db.notes.toArray(),
  ]);

  const snapshot: WorkspaceSnapshot = {
    version: '1.0',
    exportedAt: Date.now(),
    projects,
    tasks,
    messages,
    notes,
  };

  return new Blob([JSON.stringify(snapshot, null, 2)], {
    type: 'application/json',
  });
}

/**
 * Import workspace from JSON file
 */
export async function importWorkspace(file: File) {
  const text = await file.text();
  const snapshot: WorkspaceSnapshot = JSON.parse(text);

  if (snapshot.version !== '1.0') {
    throw new Error('Unsupported snapshot version');
  }

  // Clear existing data
  await db.transaction('rw', db.projects, db.tasks, db.messages, db.notes, async () => {
    await db.projects.clear();
    await db.tasks.clear();
    await db.messages.clear();
    await db.notes.clear();

    // Bulk insert
    if (snapshot.projects.length) await db.projects.bulkAdd(snapshot.projects);
    if (snapshot.tasks.length) await db.tasks.bulkAdd(snapshot.tasks);
    if (snapshot.messages.length) await db.messages.bulkAdd(snapshot.messages);
    if (snapshot.notes.length) await db.notes.bulkAdd(snapshot.notes);
  });
}

/**
 * Generate download link and trigger download
 */
export async function downloadWorkspace(filename = 'workspace.json') {
  const blob = await exportWorkspace();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
