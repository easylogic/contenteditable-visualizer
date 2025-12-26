import type { EventLog } from './event-logger';
import type { DomChangeResult } from './dom-change-tracker';

export type SnapshotTrigger = 
  | 'parent-mismatch'
  | 'node-mismatch'
  | 'selection-jump'
  | 'boundary-input'
  | 'data-length-mismatch'
  | 'data-content-mismatch'
  | 'selection-mismatch'
  | 'text-leak'
  | 'sibling-created'
  | 'missing-beforeinput'
  | 'manual'
  | string;

export interface Snapshot {
  id?: number;
  timestamp: number;
  trigger?: SnapshotTrigger;
  triggerDetail?: string;
  environment: {
    os: string;
    osVersion: string;
    browser: string;
    browserVersion: string;
    device: string;
    isMobile: boolean;
  };
  eventLogs: any[];
  domBefore: string;
  domAfter: string;
  ranges: {
    sel?: any;
    comp?: any;
    bi?: any;
    input?: any;
  };
  phases: any[];
  anomalies: any[];
  domChangeResult?: any;
  aiPrompt?: string; // AI analysis prompt
}

function detectEnvironment(): Snapshot['environment'] {
  if (typeof navigator === 'undefined') {
    return { os: 'Unknown', osVersion: '', browser: 'Unknown', browserVersion: '', device: 'Unknown', isMobile: false };
  }
  const ua = navigator.userAgent;
  let os = 'Unknown', osVersion = '', browser = 'Unknown', browserVersion = '', device = 'Desktop';
  const isMobile = /Mobile|Android|iPhone|iPad/i.test(ua);

  if (/Windows NT 10/i.test(ua)) { os = 'Windows'; osVersion = '10/11'; }
  else if (/Windows/i.test(ua)) { os = 'Windows'; osVersion = ua.match(/Windows NT (\d+\.\d+)/)?.[1] || ''; }
  else if (/Mac OS X/i.test(ua)) { os = 'macOS'; osVersion = ua.match(/Mac OS X (\d+[._]\d+)/)?.[1]?.replace('_', '.') || ''; }
  else if (/Android/i.test(ua)) { os = 'Android'; osVersion = ua.match(/Android (\d+(\.\d+)?)/)?.[1] || ''; }
  else if (/iPhone|iPad/i.test(ua)) { os = 'iOS'; osVersion = ua.match(/OS (\d+[._]\d+)/)?.[1]?.replace('_', '.') || ''; }
  else if (/Linux/i.test(ua)) { os = 'Linux'; }

  if (/Edg\//i.test(ua)) { browser = 'Edge'; browserVersion = ua.match(/Edg\/(\d+(\.\d+)?)/)?.[1] || ''; }
  else if (/Chrome\//.test(ua) && !/Edg\//.test(ua)) { browser = 'Chrome'; browserVersion = ua.match(/Chrome\/(\d+(\.\d+)?)/)?.[1] || ''; }
  else if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) { browser = 'Safari'; browserVersion = ua.match(/Version\/(\d+(\.\d+)?)/)?.[1] || ''; }
  else if (/Firefox\//.test(ua)) { browser = 'Firefox'; browserVersion = ua.match(/Firefox\/(\d+(\.\d+)?)/)?.[1] || ''; }

  if (/iPhone/i.test(ua)) device = 'iPhone';
  else if (/iPad/i.test(ua)) device = 'iPad';
  else if (isMobile) device = 'Mobile';

  return { os, osVersion, browser, browserVersion, device, isMobile };
}

const DB_NAME = 'contenteditable-visualizer-snapshots';
const DB_VERSION = 1;
const STORE_NAME = 'snapshots';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });

  return dbPromise;
}

const MAX_SNAPSHOTS = 50;

/**
 * SnapshotManager - Manages snapshot storage and retrieval using IndexedDB
 * 
 * @example
 * ```typescript
 * const manager = new SnapshotManager();
 * const snapshot = manager.createSnapshot(element, eventLogs, domChangeResult);
 * const id = await manager.saveSnapshot(snapshot);
 * ```
 */
export class SnapshotManager {
  /**
   * Saves a snapshot to IndexedDB
   * 
   * @param snapshot - Snapshot data to save (without id)
   * @returns Promise that resolves to the snapshot ID
   */
  async saveSnapshot(snapshot: Omit<Snapshot, 'id'>): Promise<number> {
    const db = await openDB();
    
    const id = await new Promise<number>((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.add({ ...snapshot, timestamp: snapshot.timestamp || Date.now() });

      request.onsuccess = () => resolve(request.result as number);
      request.onerror = () => reject(request.error);
    });
    
    // Apply limit after saving
    try {
      const allSnapshots = await this.getAllSnapshots();
      
      if (allSnapshots.length > MAX_SNAPSHOTS) {
        const toDelete = allSnapshots.slice(MAX_SNAPSHOTS);
        await Promise.all(
          toDelete.map((oldSnapshot) => this.deleteSnapshot(oldSnapshot.id!))
        );
      }
    } catch (error) {
      console.warn('Failed to enforce snapshot limit:', error);
    }
    
    return id;
  }

  /**
   * Gets a snapshot by ID
   * 
   * @param id - Snapshot ID
   * @returns Promise that resolves to the snapshot or null if not found
   */
  async getSnapshot(id: number): Promise<Snapshot | null> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Gets all stored snapshots, sorted by timestamp (newest first)
   * 
   * @returns Promise that resolves to an array of snapshots
   */
  async getAllSnapshots(): Promise<Snapshot[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('timestamp');
      const request = index.getAll();

      request.onsuccess = () => {
        const snapshots = request.result || [];
        snapshots.sort((a, b) => b.timestamp - a.timestamp);
        resolve(snapshots);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Deletes a snapshot by ID
   * 
   * @param id - Snapshot ID to delete
   */
  async deleteSnapshot(id: number): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clears all stored snapshots
   */
  async clearAllSnapshots(): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Creates a snapshot from current editor state
   * 
   * @param element - The editor element
   * @param eventLogs - Array of event logs
   * @param domChangeResult - Optional DOM change detection result
   * @param trigger - Optional trigger type
   * @param triggerDetail - Optional trigger detail
   * @returns Snapshot data (without id)
   */
  createSnapshot(
    element: HTMLElement,
    eventLogs: EventLog[],
    domChangeResult?: DomChangeResult,
    trigger?: SnapshotTrigger,
    triggerDetail?: string
  ): Omit<Snapshot, 'id'> {
    const selection = window.getSelection();
    const selRange = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

    return {
      timestamp: Date.now(),
      trigger,
      triggerDetail,
      environment: detectEnvironment(),
      eventLogs: eventLogs.map(log => {
        const { range, ...rest } = log;
        return {
          ...rest,
          range: range ? {
            collapsed: range.collapsed,
            startContainer: range.startContainer.nodeType === Node.TEXT_NODE ? '#text' : (range.startContainer as Element).tagName || 'unknown',
            startOffset: range.startOffset,
            endContainer: range.endContainer.nodeType === Node.TEXT_NODE ? '#text' : (range.endContainer as Element).tagName || 'unknown',
            endOffset: range.endOffset,
          } : null,
        };
      }),
      domBefore: '', // DOM at beforeinput point needs to be stored separately
      domAfter: element.innerHTML,
      ranges: {
        sel: selRange ? {
          collapsed: selRange.collapsed,
          startContainer: selRange.startContainer.nodeType === Node.TEXT_NODE ? '#text' : (selRange.startContainer as Element).tagName || 'unknown',
          startOffset: selRange.startOffset,
          endContainer: selRange.endContainer.nodeType === Node.TEXT_NODE ? '#text' : (selRange.endContainer as Element).tagName || 'unknown',
          endOffset: selRange.endOffset,
        } : null,
      },
      phases: [],
      anomalies: [],
      domChangeResult: domChangeResult ? {
        deletedRects: domChangeResult.deletedRects.map(r => ({ x: r.x, y: r.y, width: r.width, height: r.height, top: r.top, left: r.left, bottom: r.bottom, right: r.right })),
        addedRects: domChangeResult.addedRects.map(r => ({ x: r.x, y: r.y, width: r.width, height: r.height, top: r.top, left: r.left, bottom: r.bottom, right: r.right })),
        modifiedNodes: domChangeResult.modifiedNodes.map(node => ({
          before: node.before ? {
            id: node.before.id,
            parentSignature: node.before.parentSignature,
            text: node.before.text,
            offset: node.before.offset,
          } : null,
          after: node.after ? {
            id: node.after.id,
            parentSignature: node.after.parentSignature,
            text: node.after.text,
            offset: node.after.offset,
          } : null,
          changeType: node.changeType,
        })),
      } : undefined,
    };
  }
}

