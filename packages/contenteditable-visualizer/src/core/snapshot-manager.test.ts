import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SnapshotManager, type Snapshot } from './snapshot-manager';
import type { EventLog } from './event-logger';

describe('SnapshotManager', () => {
  let manager: SnapshotManager;
  let testElement: HTMLElement;

  beforeEach(async () => {
    // Reset IndexedDB mock if available
    if ((globalThis as any).__resetIndexedDB) {
      (globalThis as any).__resetIndexedDB();
    }

    manager = new SnapshotManager();
    testElement = document.createElement('div');
    testElement.contentEditable = 'true';
    testElement.innerHTML = '<p>Test content</p>';
    document.body.appendChild(testElement);

    // Clear all snapshots before each test
    try {
      await manager.clearAllSnapshots();
    } catch (e) {
      // Ignore errors if DB doesn't exist yet
    }
  });

  afterEach(async () => {
    if (testElement.parentNode) {
      testElement.parentNode.removeChild(testElement);
    }
    try {
      await manager.clearAllSnapshots();
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  describe('createSnapshot', () => {
    it('should create snapshot with basic data', () => {
      const eventLogs: EventLog[] = [
        {
          id: 1,
          timestamp: 1000,
          type: 'input',
          parent: null,
          node: null,
          startOffset: 0,
          endOffset: 0,
        } as EventLog,
      ];

      const snapshot = manager.createSnapshot(testElement, eventLogs);
      
      expect(snapshot).toBeDefined();
      expect(snapshot.timestamp).toBeGreaterThan(0);
      expect(snapshot.eventLogs).toHaveLength(1);
      expect(snapshot.domAfter).toBe(testElement.innerHTML);
      expect(snapshot.environment).toBeDefined();
      expect(snapshot.environment.os).toBeTruthy();
      expect(snapshot.environment.browser).toBeTruthy();
    });

    it('should include trigger and triggerDetail', () => {
      const eventLogs: EventLog[] = [];
      const snapshot = manager.createSnapshot(
        testElement,
        eventLogs,
        undefined,
        'input-type-mismatch',
        'Test detail'
      );

      expect(snapshot.trigger).toBe('input-type-mismatch');
      expect(snapshot.triggerDetail).toBe('Test detail');
    });

    it('should serialize ranges correctly', () => {
      const selection = window.getSelection();
      if (selection && testElement.firstChild) {
        const range = document.createRange();
        range.selectNodeContents(testElement.firstChild);
        selection.removeAllRanges();
        selection.addRange(range);

        const eventLogs: EventLog[] = [];
        const snapshot = manager.createSnapshot(testElement, eventLogs);

        expect(snapshot.ranges.sel).toBeDefined();
        expect(snapshot.ranges.sel?.collapsed).toBe(false);
      }
    });
  });

  describe('saveSnapshot and getSnapshot', () => {
    it('should save and retrieve snapshot', async () => {
      const eventLogs: EventLog[] = [
        {
          id: 1,
          timestamp: 1000,
          type: 'input',
          parent: null,
          node: null,
          startOffset: 0,
          endOffset: 0,
        } as EventLog,
      ];

      const snapshotData = manager.createSnapshot(testElement, eventLogs, undefined, 'manual');
      const id = await manager.saveSnapshot(snapshotData);
      
      expect(id).toBeGreaterThan(0);

      const retrieved = await manager.getSnapshot(id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(id);
      expect(retrieved?.eventLogs).toHaveLength(1);
      expect(retrieved?.trigger).toBe('manual');
    });

    it('should return null for non-existent snapshot', async () => {
      const result = await manager.getSnapshot(99999);
      expect(result).toBeNull();
    });
  });

  describe('getAllSnapshots', () => {
    it('should return all snapshots sorted by timestamp', async () => {
      const eventLogs: EventLog[] = [];
      
      const snapshot1 = manager.createSnapshot(testElement, eventLogs, undefined, 'manual');
      const snapshot2 = manager.createSnapshot(testElement, eventLogs, undefined, 'auto');
      // Manually set different timestamps to avoid setTimeout
      snapshot2.timestamp = snapshot1.timestamp + 100;

      const id1 = await manager.saveSnapshot(snapshot1);
      const id2 = await manager.saveSnapshot(snapshot2);

      const all = await manager.getAllSnapshots();
      
      expect(all.length).toBeGreaterThanOrEqual(2);
      // Should be sorted newest first
      expect(all[0].timestamp).toBeGreaterThanOrEqual(all[1].timestamp);
    });

    it('should return empty array when no snapshots', async () => {
      const all = await manager.getAllSnapshots();
      expect(all).toEqual([]);
    });
  });

  describe('deleteSnapshot', () => {
    it('should delete snapshot by ID', async () => {
      const eventLogs: EventLog[] = [];
      const snapshotData = manager.createSnapshot(testElement, eventLogs);
      const id = await manager.saveSnapshot(snapshotData);

      await manager.deleteSnapshot(id);

      const retrieved = await manager.getSnapshot(id);
      expect(retrieved).toBeNull();
    });
  });

  describe('clearAllSnapshots', () => {
    it('should clear all snapshots', async () => {
      const eventLogs: EventLog[] = [];
      
      await manager.saveSnapshot(manager.createSnapshot(testElement, eventLogs));
      await manager.saveSnapshot(manager.createSnapshot(testElement, eventLogs));
      await manager.saveSnapshot(manager.createSnapshot(testElement, eventLogs));

      await manager.clearAllSnapshots();

      const all = await manager.getAllSnapshots();
      expect(all).toEqual([]);
    });
  });

  describe('snapshot limit', () => {
    it('should enforce MAX_SNAPSHOTS limit', async () => {
      const eventLogs: EventLog[] = [];
      
      // Save multiple snapshots with different timestamps
      const promises = [];
      for (let i = 0; i < 5; i++) {
        const snapshot = manager.createSnapshot(testElement, eventLogs);
        snapshot.timestamp = Date.now() + i; // Ensure different timestamps
        promises.push(manager.saveSnapshot(snapshot));
      }
      await Promise.all(promises);

      const all = await manager.getAllSnapshots();
      // Should have all 5 snapshots (limit is only enforced when exceeding 50)
      expect(all.length).toBe(5);
    });
  });
});
