// client/src/lib/embedded/yjs.ts
import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';

export interface NoteDoc {
  ydoc: Y.Doc;
  ytext: Y.Text;
  provider: IndexeddbPersistence;
}

export function createNoteDoc(noteId: string): NoteDoc {
  const ydoc = new Y.Doc();

  // Persist to IndexedDB (y-indexeddb)
  const provider = new IndexeddbPersistence(`note:${noteId}`, ydoc);

  const ytext = ydoc.getText('content');

  return { ydoc, ytext, provider };
}

export function destroyNoteDoc(doc: NoteDoc) {
  doc.provider.destroy();
  doc.ydoc.destroy();
}

/**
 * Export Yjs doc to JSON string
 */
export function exportYjsToJSON(ydoc: Y.Doc): string {
  const state = Y.encodeStateAsUpdate(ydoc);
  return btoa(String.fromCharCode(...state));
}

/**
 * Import Yjs doc from JSON string
 */
export function importYjsFromJSON(ydoc: Y.Doc, json: string) {
  const binaryString = atob(json);
  const bytes: number[] = [];
  for (let i = 0; i < binaryString.length; i++) {
    bytes.push(binaryString.charCodeAt(i));
  }
  const state = new Uint8Array(bytes);
  Y.applyUpdate(ydoc, state);
}
