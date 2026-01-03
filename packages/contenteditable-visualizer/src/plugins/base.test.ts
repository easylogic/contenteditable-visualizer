import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BasePlugin, type PluginEvent } from './base';
import type { ContentEditableVisualizer } from '../index';
import type { PluginMetadata, PluginOptions } from './types';

// Mock plugin implementation for testing
class TestPlugin extends BasePlugin {
  readonly metadata: PluginMetadata = {
    id: 'test-plugin',
    name: 'Test Plugin',
    version: '1.0.0',
  };

  protected onInitialize(): void {
    // Test implementation
  }

  protected onAttach(): void {
    // Test implementation
  }

  protected onDetach(): void {
    // Test implementation
  }
}

describe('BasePlugin', () => {
  let plugin: TestPlugin;
  let mockVisualizer: Partial<ContentEditableVisualizer>;
  let mockEditor: any;

  beforeEach(() => {
    plugin = new TestPlugin();
    mockEditor = {};
    mockVisualizer = {
      getLatestContentEditableEvent: vi.fn(),
    };
  });

  describe('initialization', () => {
    it('should initialize with editor and visualizer', () => {
      plugin.initialize(mockEditor, mockVisualizer as ContentEditableVisualizer);
      expect(plugin).toBeDefined();
    });

    it('should not initialize if disabled', () => {
      const disabledPlugin = new TestPlugin({ enabled: false });
      disabledPlugin.initialize(mockEditor, mockVisualizer as ContentEditableVisualizer);
      // Should not throw
      expect(disabledPlugin).toBeDefined();
    });
  });

  describe('attach and detach', () => {
    it('should attach plugin', () => {
      plugin.initialize(mockEditor, mockVisualizer as ContentEditableVisualizer);
      plugin.attach();
      expect(plugin).toBeDefined();
    });

    it('should not attach if not initialized', () => {
      const newPlugin = new TestPlugin();
      newPlugin.attach();
      // Should not throw, but won't attach
      expect(newPlugin).toBeDefined();
    });

    it('should detach plugin', () => {
      plugin.initialize(mockEditor, mockVisualizer as ContentEditableVisualizer);
      plugin.attach();
      plugin.detach();
      expect(plugin).toBeDefined();
    });

    it('should not detach if not attached', () => {
      plugin.initialize(mockEditor, mockVisualizer as ContentEditableVisualizer);
      plugin.detach(); // Should not throw
      expect(plugin).toBeDefined();
    });
  });

  describe('addEditorEvent', () => {
    it('should add editor event', () => {
      plugin.initialize(mockEditor, mockVisualizer as ContentEditableVisualizer);
      
      const event = plugin['addEditorEvent']('test-event', { data: 'test' });
      
      expect(event).toBeDefined();
      expect(event.type).toBe('test-event');
      expect(event.data).toEqual({ data: 'test' });
      expect(event.timestamp).toBeGreaterThan(0);
    });

    it('should use provided timestamp', () => {
      plugin.initialize(mockEditor, mockVisualizer as ContentEditableVisualizer);
      
      const timestamp = 1234567890;
      const event = plugin['addEditorEvent']('test-event', { data: 'test' }, timestamp);
      
      expect(event.timestamp).toBe(timestamp);
    });

    it('should limit event history', () => {
      plugin.initialize(mockEditor, mockVisualizer as ContentEditableVisualizer);
      
      // Add more than maxEditorEvents (100)
      for (let i = 0; i < 150; i++) {
        plugin['addEditorEvent']('test-event', { index: i });
      }

      const events = plugin.getEvents?.() || [];
      expect(events.length).toBeLessThanOrEqual(100);
    });
  });

  describe('onContentEditableEvent', () => {
    it('should store contenteditable events', () => {
      plugin.initialize(mockEditor, mockVisualizer as ContentEditableVisualizer);
      
      plugin.onContentEditableEvent({ id: 1, timestamp: 1000, type: 'input' });
      plugin.onContentEditableEvent({ id: 2, timestamp: 1001, type: 'beforeinput' });

      expect(plugin['recentContentEditableEvents'].length).toBe(2);
    });

    it('should limit recent events', () => {
      plugin.initialize(mockEditor, mockVisualizer as ContentEditableVisualizer);
      
      // Add more than maxRecentEvents (50)
      for (let i = 0; i < 60; i++) {
        plugin.onContentEditableEvent({ id: i, timestamp: 1000 + i, type: 'input' });
      }

      expect(plugin['recentContentEditableEvents'].length).toBeLessThanOrEqual(50);
    });
  });

  describe('findRelatedContentEditableEvent', () => {
    it('should find related event within time window', () => {
      plugin.initialize(mockEditor, mockVisualizer as ContentEditableVisualizer);
      
      plugin.onContentEditableEvent({ id: 1, timestamp: 1000, type: 'input' });
      plugin.onContentEditableEvent({ id: 2, timestamp: 1001, type: 'beforeinput' });

      const relatedId = plugin['findRelatedContentEditableEvent'](1005, 50);
      expect(relatedId).toBe(2); // Should find the closest input/beforeinput event
    });

    it('should return undefined if no related event found', () => {
      plugin.initialize(mockEditor, mockVisualizer as ContentEditableVisualizer);
      
      const relatedId = plugin['findRelatedContentEditableEvent'](1000, 50);
      expect(relatedId).toBeUndefined();
    });

    it('should only match input and beforeinput events', () => {
      plugin.initialize(mockEditor, mockVisualizer as ContentEditableVisualizer);
      
      plugin.onContentEditableEvent({ id: 1, timestamp: 1000, type: 'selectionchange' });
      plugin.onContentEditableEvent({ id: 2, timestamp: 1001, type: 'input' });

      const relatedId = plugin['findRelatedContentEditableEvent'](1005, 50);
      expect(relatedId).toBe(2); // Should find input, not selectionchange
    });
  });

  describe('getEvents', () => {
    it('should return copy of events array', () => {
      plugin.initialize(mockEditor, mockVisualizer as ContentEditableVisualizer);
      
      plugin['addEditorEvent']('test-event', { data: 'test' });
      
      const events1 = plugin.getEvents?.() || [];
      const events2 = plugin.getEvents?.() || [];
      
      expect(events1).not.toBe(events2); // Should be different arrays (copies)
      expect(events1).toEqual(events2); // But same content
    });
  });

  describe('clearEditorEvents', () => {
    it('should clear all editor events', () => {
      plugin.initialize(mockEditor, mockVisualizer as ContentEditableVisualizer);
      
      plugin['addEditorEvent']('test-event', { data: 'test' });
      plugin['clearEditorEvents']();
      
      const events = plugin.getEvents?.() || [];
      expect(events.length).toBe(0);
    });
  });

  describe('getRecentEditorEvents', () => {
    it('should return recent N events', () => {
      plugin.initialize(mockEditor, mockVisualizer as ContentEditableVisualizer);
      
      for (let i = 0; i < 10; i++) {
        plugin['addEditorEvent']('test-event', { index: i });
      }

      const recent = plugin['getRecentEditorEvents'](3);
      expect(recent.length).toBe(3);
      expect(recent[recent.length - 1].data.index).toBe(9); // Most recent
    });
  });

  describe('destroy', () => {
    it('should clean up resources', () => {
      plugin.initialize(mockEditor, mockVisualizer as ContentEditableVisualizer);
      plugin.attach();
      
      plugin['addEditorEvent']('test-event', { data: 'test' });
      plugin.onContentEditableEvent({ id: 1, timestamp: 1000, type: 'input' });
      
      plugin.destroy();
      
      const events = plugin.getEvents?.() || [];
      expect(events.length).toBe(0);
      expect(plugin['recentContentEditableEvents'].length).toBe(0);
    });
  });
});
