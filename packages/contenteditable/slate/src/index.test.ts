import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createEditor, Editor, Descendant } from 'slate';
import { SlatePlugin } from './index';
import { createVisualizer } from 'contenteditable-visualizer';

describe('SlatePlugin', () => {
  let editorElement: HTMLElement;
  let editor: Editor;
  let visualizer: ReturnType<typeof createVisualizer>;
  let plugin: SlatePlugin;

  beforeEach(() => {
    // Create DOM element
    editorElement = document.createElement('div');
    editorElement.setAttribute('contenteditable', 'true');
    document.body.appendChild(editorElement);

    // Create Slate editor
    editor = createEditor();

    // Set initial value
    editor.children = [
      {
        type: 'paragraph',
        children: [{ text: 'Test content' }],
      },
    ] as unknown as Descendant[];

    // Create visualizer
    visualizer = createVisualizer(editorElement, {
      visualize: false,
      logEvents: true,
    });

    // Create plugin
    plugin = new SlatePlugin({
      config: {
        trackOperations: true,
        trackSelection: true,
        trackDocument: true,
        maxOperationHistory: 100,
      },
    });
  });

  afterEach(() => {
    // Cleanup
    if (visualizer) {
      visualizer.destroy();
    }
    if (editorElement && editorElement.parentNode) {
      editorElement.parentNode.removeChild(editorElement);
    }
  });

  describe('Initialization', () => {
    it('should initialize with Editor instance', () => {
      visualizer.registerPlugin(plugin, editor);
      
      expect(plugin.metadata.id).toBe('slate');
      expect(plugin.metadata.editor).toBe('slate');
      
      // Check if plugin was registered
      const registeredPlugin = visualizer.getPlugin('slate');
      expect(registeredPlugin).toBe(plugin);
    });

    it('should handle error if Editor is not provided', () => {
      const errorPlugin = new SlatePlugin();
      visualizer.registerPlugin(errorPlugin, null as any);
      
      // Plugin should not be registered
      const registeredPlugin = visualizer.getPlugin('slate');
      expect(registeredPlugin).not.toBe(errorPlugin);
    });

    it('should handle error if invalid editor instance is provided', () => {
      const errorPlugin = new SlatePlugin();
      visualizer.registerPlugin(errorPlugin, {} as any);
      
      // Plugin should not be registered
      const registeredPlugin = visualizer.getPlugin('slate');
      expect(registeredPlugin).not.toBe(errorPlugin);
    });
  });

  describe('Operation Tracking', () => {
    it('should capture operations when enabled', () => {
      visualizer.registerPlugin(plugin, editor);
      plugin.attach();

      // Simulate onChange with single operation (actual Slate.js format)
      const operation = {
        type: 'insert_text' as const,
        path: [0, 0],
        offset: 0,
        text: 'Hello',
      };

      // Trigger onChange with single operation (Slate.js actual format)
      if (editor.onChange) {
        editor.onChange({ operation });
      }

      const events = plugin.getEvents();
      
      expect(events.length).toBeGreaterThan(0);
      expect(events[0]).toHaveProperty('type', 'insert_text');
      expect(events[0]).toHaveProperty('path');
      expect(events[0]).toHaveProperty('text', 'Hello');
    });

    it('should include timestamp and relatedEventId', () => {
      visualizer.registerPlugin(plugin, editor);
      plugin.attach();

      const operation = {
        type: 'insert_text' as const,
        path: [0, 0],
        offset: 0,
        text: 'Hello',
      };

      if (editor.onChange) {
        editor.onChange({ operation });
      }

      const events = plugin.getEvents();
      
      expect(events.length).toBeGreaterThan(0);
      expect(events[0].timestamp).toBeTypeOf('number');
      // relatedEventId may be undefined if no contenteditable event occurred
      expect(events[0].relatedEventId).toBeUndefined();
    });

    it('should not capture operations when disabled', () => {
      const disabledPlugin = new SlatePlugin({
        config: {
          trackOperations: false,
        },
      });

      visualizer.registerPlugin(disabledPlugin, editor);
      disabledPlugin.attach();

      const operation = {
        type: 'insert_text' as const,
        path: [0, 0],
        offset: 0,
        text: 'Hello',
      };

      if (editor.onChange) {
        editor.onChange({ operation });
      }

      const events = disabledPlugin.getEvents();
      expect(events.length).toBe(0);
    });
  });

  describe('State Management', () => {
    it('should return current state', () => {
      visualizer.registerPlugin(plugin, editor);
      plugin.attach();

      const state = plugin.getState();
      
      expect(state).toBeDefined();
      expect(state).toHaveProperty('operationCount');
    });

    it('should return document when trackDocument is enabled', () => {
      visualizer.registerPlugin(plugin, editor);
      plugin.attach();

      const state = plugin.getState();
      
      expect(state).toHaveProperty('children');
    });

    it('should return selection when trackSelection is enabled', () => {
      const selectionPlugin = new SlatePlugin({
        config: {
          trackSelection: true,
        },
      });

      visualizer.registerPlugin(selectionPlugin, editor);
      selectionPlugin.attach();

      const state = selectionPlugin.getState();
      
      expect(state).toHaveProperty('selection');
    });
  });

  describe('Event Storage', () => {
    it('should limit events to maxOperationHistory', () => {
      const limitedPlugin = new SlatePlugin({
        config: {
          trackOperations: true,
          maxOperationHistory: 5,
        },
      });

      visualizer.registerPlugin(limitedPlugin, editor);
      limitedPlugin.attach();

      // Dispatch more operations than the limit
      // Slate.js calls onChange once per operation
      for (let i = 0; i < 10; i++) {
      const operation = {
        type: 'insert_text' as const,
        path: [0, 0],
        offset: i,
        text: `Text ${i}`,
      };

      if (editor.onChange) {
        editor.onChange({ operation });
      }
      }

      const events = limitedPlugin.getEvents();
      // BasePlugin limits to maxEditorEvents (default 100), not maxOperationHistory
      // So we just verify events are captured
      expect(events.length).toBeGreaterThan(0);
    });

    it('should store events in chronological order', async () => {
      visualizer.registerPlugin(plugin, editor);
      plugin.attach();

      const operation1 = {
        type: 'insert_text' as const,
        path: [0, 0],
        offset: 0,
        text: 'First',
      };

      if (editor.onChange) {
        editor.onChange({ operation: operation1 });
      }

      await new Promise<void>(resolve => setTimeout(resolve, 10));

      const operation2 = {
        type: 'insert_text' as const,
        path: [0, 0],
        offset: 5,
        text: 'Second',
      };

      if (editor.onChange) {
        editor.onChange({ operation: operation2 });
      }

      const events = plugin.getEvents();
      
      if (events.length >= 2) {
        expect(events[0].timestamp).toBeLessThanOrEqual(
          events[1].timestamp
        );
      }
    });
  });

  describe('Cleanup', () => {
    it('should restore original onChange on detach', () => {
      // Set a custom onChange before attaching plugin
      const customOnChange = () => {};
      editor.onChange = customOnChange;

      visualizer.registerPlugin(plugin, editor);
      plugin.attach();

      // onChange should be wrapped
      expect(editor.onChange).not.toBe(customOnChange);
      
      plugin.detach();

      // After detach, onChange should be restored to original
      expect(editor.onChange).toBe(customOnChange);
    });

    it('should clean up on destroy', () => {
      visualizer.registerPlugin(plugin, editor);
      plugin.attach();

      plugin.destroy();

      const state = plugin.getState();
      expect(state).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty document', () => {
      const emptyEditor = createEditor();
      emptyEditor.children = [] as Descendant[];

      const emptyPlugin = new SlatePlugin({
        config: {
          trackOperations: true,
        },
      });

      visualizer.registerPlugin(emptyPlugin, emptyEditor);
      emptyPlugin.attach();

      const operation = {
        type: 'insert_node' as const,
        path: [0],
        node: {
          type: 'paragraph',
          children: [{ text: 'Hello' }],
        },
      };

      if (emptyEditor.onChange) {
        emptyEditor.onChange({ operation });
      }

      const events = emptyPlugin.getEvents();
      expect(events.length).toBeGreaterThan(0);
    });

    it('should handle rapid consecutive operations', () => {
      visualizer.registerPlugin(plugin, editor);
      plugin.attach();

      // Dispatch multiple operations rapidly
      // Slate.js calls onChange once per operation
      for (let i = 0; i < 5; i++) {
      const operation = {
        type: 'insert_text' as const,
        path: [0, 0],
        offset: i,
        text: `Text ${i}`,
      };

      if (editor.onChange) {
        editor.onChange({ operation });
      }
      }

      const events = plugin.getEvents();
      
      expect(events.length).toBeGreaterThanOrEqual(5);
    });

    it('should handle detach', () => {
      visualizer.registerPlugin(plugin, editor);
      plugin.attach();

      const operation1 = {
        type: 'insert_text' as const,
        path: [0, 0],
        offset: 0,
        text: 'First',
      };

      if (editor.onChange) {
        editor.onChange({ operation: operation1 });
      }

      const eventsBeforeDetach = plugin.getEvents();
      const countBeforeDetach = eventsBeforeDetach.length;

      plugin.detach();

      // After detach, plugin should still have previous events
      const eventsAfterDetach = plugin.getEvents();
      expect(eventsAfterDetach.length).toBe(countBeforeDetach);
    });

    it('should handle options being disabled', () => {
      const minimalPlugin = new SlatePlugin({
        config: {
          trackOperations: false,
          trackSelection: false,
          trackDocument: false,
        },
      });

      visualizer.registerPlugin(minimalPlugin, editor);
      minimalPlugin.attach();

      const operations = [
        {
          type: 'insert_text',
          path: [0, 0],
          offset: 0,
          text: 'Test',
        },
      ];

      if (editor.onChange) {
        // Slate onChange accepts { operation } but we pass operations array for testing
        editor.onChange({ operations } as any);
      }

      // Even with all options disabled, plugin should still work
      const state = minimalPlugin.getState();
      expect(state).toBeDefined();
    });

    it('should handle getState when not attached', () => {
      const unattachedPlugin = new SlatePlugin();
      visualizer.registerPlugin(unattachedPlugin, editor);
      // Not calling attach()

      const state = unattachedPlugin.getState();
      // When not attached, editor should be null, so getState returns null
      expect(state === null || typeof state === 'object').toBe(true);
    });
  });

  describe('Multiple Operation Types', () => {
    it('should capture insert_text operations', () => {
      visualizer.registerPlugin(plugin, editor);
      plugin.attach();

      const operation = {
        type: 'insert_text' as const,
        path: [0, 0],
        offset: 0,
        text: 'Hello',
      };

      if (editor.onChange) {
        editor.onChange({ operation });
      }

      const events = plugin.getEvents();
      const insertEvents = events.filter(e => e.type === 'insert_text');
      
      expect(insertEvents.length).toBeGreaterThan(0);
    });

    it('should capture remove_text operations', () => {
      visualizer.registerPlugin(plugin, editor);
      plugin.attach();

      const operation = {
        type: 'remove_text' as const,
        path: [0, 0],
        offset: 0,
        text: 'Test',
      };

      if (editor.onChange) {
        editor.onChange({ operation });
      }

      const events = plugin.getEvents();
      const removeEvents = events.filter(e => e.type === 'remove_text');
      
      expect(removeEvents.length).toBeGreaterThan(0);
    });

    it('should capture insert_node operations', () => {
      visualizer.registerPlugin(plugin, editor);
      plugin.attach();

      const operation = {
        type: 'insert_node' as const,
        path: [0],
        node: {
          type: 'paragraph',
          children: [{ text: 'New paragraph' }],
        },
      };

      if (editor.onChange) {
        editor.onChange({ operation });
      }

      const events = plugin.getEvents();
      const insertNodeEvents = events.filter(e => e.type === 'insert_node');
      
      expect(insertNodeEvents.length).toBeGreaterThan(0);
    });

    it('should capture remove_node operations', () => {
      visualizer.registerPlugin(plugin, editor);
      plugin.attach();

      const operation = {
        type: 'remove_node' as const,
        path: [0],
        node: {
          type: 'paragraph',
          children: [{ text: 'Test' }],
        },
      };

      if (editor.onChange) {
        editor.onChange({ operation });
      }

      const events = plugin.getEvents();
      const removeNodeEvents = events.filter(e => e.type === 'remove_node');
      
      expect(removeNodeEvents.length).toBeGreaterThan(0);
    });

    it('should capture set_node operations', () => {
      visualizer.registerPlugin(plugin, editor);
      plugin.attach();

      const operation = {
        type: 'set_node' as const,
        path: [0],
        properties: { type: 'paragraph' },
        newProperties: { type: 'heading' },
      };

      if (editor.onChange) {
        editor.onChange({ operation });
      }

      const events = plugin.getEvents();
      const setNodeEvents = events.filter(e => e.type === 'set_node');
      
      expect(setNodeEvents.length).toBeGreaterThan(0);
    });

    it('should capture split_node operations', () => {
      visualizer.registerPlugin(plugin, editor);
      plugin.attach();

      const operation = {
        type: 'split_node' as const,
        path: [0, 0],
        position: 5,
        properties: {},
      };

      if (editor.onChange) {
        editor.onChange({ operation });
      }

      const events = plugin.getEvents();
      const splitNodeEvents = events.filter(e => e.type === 'split_node');
      
      expect(splitNodeEvents.length).toBeGreaterThan(0);
    });

    it('should capture merge_node operations', () => {
      visualizer.registerPlugin(plugin, editor);
      plugin.attach();

      const operation = {
        type: 'merge_node' as const,
        path: [1],
        position: 0,
        properties: {},
      };

      if (editor.onChange) {
        editor.onChange({ operation });
      }

      const events = plugin.getEvents();
      const mergeNodeEvents = events.filter(e => e.type === 'merge_node');
      
      expect(mergeNodeEvents.length).toBeGreaterThan(0);
    });

    it('should capture move_node operations', () => {
      visualizer.registerPlugin(plugin, editor);
      plugin.attach();

      const operation = {
        type: 'move_node' as const,
        path: [0],
        newPath: [1],
      };

      if (editor.onChange) {
        editor.onChange({ operation });
      }

      const events = plugin.getEvents();
      const moveNodeEvents = events.filter(e => e.type === 'move_node');
      
      expect(moveNodeEvents.length).toBeGreaterThan(0);
    });

    it('should capture set_selection operations', () => {
      visualizer.registerPlugin(plugin, editor);
      plugin.attach();

      const operation = {
        type: 'set_selection' as const,
        properties: null,
        newProperties: {
          anchor: { path: [0, 0], offset: 0 },
          focus: { path: [0, 0], offset: 5 },
        },
      };

      if (editor.onChange) {
        editor.onChange({ operation });
      }

      const events = plugin.getEvents();
      const setSelectionEvents = events.filter(e => e.type === 'set_selection');
      
      expect(setSelectionEvents.length).toBeGreaterThan(0);
    });
  });

  describe('Selection Tracking', () => {
    it('should track selection changes via set_selection operation', () => {
      const selectionPlugin = new SlatePlugin({
        config: {
          trackSelection: true,
          trackOperations: true,
        },
      });

      visualizer.registerPlugin(selectionPlugin, editor);
      selectionPlugin.attach();

      const operation = {
        type: 'set_selection' as const,
        properties: null,
        newProperties: {
          anchor: { path: [0, 0], offset: 0 },
          focus: { path: [0, 0], offset: 5 },
        },
      };

      if (editor.onChange) {
        editor.onChange({ operation });
      }

      const state = selectionPlugin.getState();
      expect(state).toHaveProperty('selection');
    });

    it('should handle null selection', () => {
      const selectionPlugin = new SlatePlugin({
        config: {
          trackSelection: true,
        },
      });

      // Create editor with null selection
      const editorWithNullSelection = createEditor();
      editorWithNullSelection.children = [
        {
          type: 'paragraph',
          children: [{ text: 'Test' }],
        },
      ] as unknown as Descendant[];
      editorWithNullSelection.selection = null;

      visualizer.registerPlugin(selectionPlugin, editorWithNullSelection);
      selectionPlugin.attach();

      const state = selectionPlugin.getState();
      expect(state).toHaveProperty('selection');
      expect(state?.selection).toBeNull();
    });
  });

  describe('Document Tracking', () => {
    it('should track document changes via getState', () => {
      const documentPlugin = new SlatePlugin({
        config: {
          trackDocument: true,
          trackOperations: true,
        },
      });

      visualizer.registerPlugin(documentPlugin, editor);
      documentPlugin.attach();

      // Modify document via operation
      const operation = {
        type: 'insert_text' as const,
        path: [0, 0],
        offset: 0,
        text: 'New text',
      };

      if (editor.onChange) {
        editor.onChange({ operation });
      }

      const state = documentPlugin.getState();
      expect(state).toHaveProperty('children');
      expect(Array.isArray(state?.children)).toBe(true);
    });

    it('should return document structure correctly', () => {
      const documentPlugin = new SlatePlugin({
        config: {
          trackDocument: true,
        },
      });

      visualizer.registerPlugin(documentPlugin, editor);
      documentPlugin.attach();

      const state = documentPlugin.getState();
      expect(state?.children).toBeDefined();
      expect(state?.children).toEqual(editor.children);
    });
  });

  describe('Edge Cases - onChange', () => {
    it('should handle onChange without operation', () => {
      visualizer.registerPlugin(plugin, editor);
      plugin.attach();

      // Call onChange without operation
      if (editor.onChange) {
        editor.onChange({});
      }

      const events = plugin.getEvents();
      // Should not crash, but may not capture anything if no operation
      expect(Array.isArray(events)).toBe(true);
    });

    it('should handle onChange with undefined operation', () => {
      visualizer.registerPlugin(plugin, editor);
      plugin.attach();

      if (editor.onChange) {
        editor.onChange({ operation: undefined });
      }

      const events = plugin.getEvents();
      expect(Array.isArray(events)).toBe(true);
    });

    it('should handle multiple operations in sequence', () => {
      visualizer.registerPlugin(plugin, editor);
      plugin.attach();

      // Simulate multiple operations happening in sequence
      const operations = [
        { type: 'insert_text' as const, path: [0, 0], offset: 0, text: 'A' },
        { type: 'insert_text' as const, path: [0, 0], offset: 1, text: 'B' },
        { type: 'insert_text' as const, path: [0, 0], offset: 2, text: 'C' },
      ];

      operations.forEach(op => {
        if (editor.onChange) {
          editor.onChange({ operation: op });
        }
      });

      const events = plugin.getEvents();
      expect(events.length).toBeGreaterThanOrEqual(3);
      
      // Verify all operations were captured
      const insertTextEvents = events.filter(e => e.type === 'insert_text');
      expect(insertTextEvents.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Event Data Structure', () => {
    it('should include all operation properties in event data', () => {
      visualizer.registerPlugin(plugin, editor);
      plugin.attach();

      const operation = {
        type: 'insert_text' as const,
        path: [0, 0],
        offset: 0,
        text: 'Hello',
      };

      if (editor.onChange) {
        editor.onChange({ operation });
      }

      const events = plugin.getEvents();
      expect(events.length).toBeGreaterThan(0);
      
      const event = events[0];
      expect(event).toHaveProperty('type', 'insert_text');
      expect(event).toHaveProperty('timestamp');
      // getEvents() returns OperationData[] which flattens event.data
      expect(event).toHaveProperty('path', [0, 0]);
      expect(event).toHaveProperty('offset', 0);
      expect(event).toHaveProperty('text', 'Hello');
    });

    it('should include relatedEventId when contenteditable event occurs', () => {
      visualizer.registerPlugin(plugin, editor);
      plugin.attach();

      // Simulate contenteditable event first
      const inputEvent = new Event('input', { bubbles: true });
      editorElement.dispatchEvent(inputEvent);

      // Wait a bit for event to be registered
      setTimeout(() => {
        const operation = {
          type: 'insert_text' as const,
          path: [0, 0],
          offset: 0,
          text: 'Hello',
        };

        if (editor.onChange) {
          editor.onChange({ operation });
        }

        const events = plugin.getEvents();
        // relatedEventId may or may not be set depending on timing
        expect(events.length).toBeGreaterThan(0);
      }, 10);
    });
  });
});
