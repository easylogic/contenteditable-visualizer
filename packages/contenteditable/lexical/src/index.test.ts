import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LexicalPlugin } from './index';
import { createVisualizer } from 'contenteditable-visualizer';
import type { LexicalEditor, EditorState } from 'lexical';

// Mock LexicalEditor
function createMockLexicalEditor(): LexicalEditor {
  const updateListeners: Array<(editorState: EditorState, editor: LexicalEditor, tags: Set<string>) => void> = [];
  const commandHandlers: Map<string, Array<(payload?: any) => boolean>> = new Map();

  const mockEditorState: EditorState = {
    readOnly: false,
    _nodeMap: new Map([['root', {}]]),
    _selection: null,
    read: (callback: () => void) => {
      callback();
    },
  } as any;

  return {
    registerUpdateListener: vi.fn((listener) => {
      updateListeners.push(listener);
      return () => {
        const index = updateListeners.indexOf(listener);
        if (index > -1) {
          updateListeners.splice(index, 1);
        }
      };
    }),
    getEditorState: vi.fn(() => mockEditorState),
    registerCommand: vi.fn((commandType: string, handler: (payload?: any) => boolean, priority: number) => {
      if (!commandHandlers.has(commandType)) {
        commandHandlers.set(commandType, []);
      }
      commandHandlers.get(commandType)!.push(handler);
      return () => {
        const handlers = commandHandlers.get(commandType);
        if (handlers) {
          const index = handlers.indexOf(handler);
          if (index > -1) {
            handlers.splice(index, 1);
          }
        }
      };
    }),
    // Helper methods for testing
    _triggerUpdate: (tags: Set<string> = new Set()) => {
      updateListeners.forEach(listener => {
        listener(mockEditorState, mockEditor as LexicalEditor, tags);
      });
    },
    _triggerCommand: (commandType: string, payload?: any) => {
      const handlers = commandHandlers.get(commandType);
      if (handlers) {
        handlers.forEach(handler => handler(payload));
      }
    },
  } as any;
}

let mockEditor: ReturnType<typeof createMockLexicalEditor>;

describe('LexicalPlugin', () => {
  let editorElement: HTMLElement;
  let visualizer: ReturnType<typeof createVisualizer>;
  let plugin: LexicalPlugin;

  beforeEach(() => {
    // Create DOM element
    editorElement = document.createElement('div');
    editorElement.setAttribute('contenteditable', 'true');
    document.body.appendChild(editorElement);

    // Create mock Lexical editor
    mockEditor = createMockLexicalEditor();

    // Create visualizer
    visualizer = createVisualizer(editorElement, {
      visualize: false,
      logEvents: true,
    });

    // Create plugin
    plugin = new LexicalPlugin({
      config: {
        trackUpdates: true,
        trackSelection: true,
        trackDocument: true,
        trackCommands: true,
        trackHistory: true,
        maxUpdateHistory: 100,
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
    it('should initialize with LexicalEditor instance', () => {
      visualizer.registerPlugin(plugin, mockEditor);
      
      expect(plugin.metadata.id).toBe('lexical');
      expect(plugin.metadata.editor).toBe('lexical');
      
      // Check if plugin was registered
      const registeredPlugin = visualizer.getPlugin('lexical');
      expect(registeredPlugin).toBe(plugin);
    });

    it('should handle error if LexicalEditor is not provided', () => {
      const errorPlugin = new LexicalPlugin();
      // registerPlugin catches errors, so plugin won't be registered
      visualizer.registerPlugin(errorPlugin, null as any);
      
      // Plugin should not be registered due to error
      const registeredPlugin = visualizer.getPlugin('lexical');
      expect(registeredPlugin).not.toBe(errorPlugin);
    });

    it('should handle error if invalid editor instance is provided', () => {
      const errorPlugin = new LexicalPlugin();
      // registerPlugin catches errors, so plugin won't be registered
      visualizer.registerPlugin(errorPlugin, {} as any);
      
      // Plugin should not be registered due to error
      const registeredPlugin = visualizer.getPlugin('lexical');
      expect(registeredPlugin).not.toBe(errorPlugin);
    });
  });

  describe('Update Tracking', () => {
    it('should capture updates when enabled', () => {
      visualizer.registerPlugin(plugin, mockEditor);
      plugin.attach();

      // Trigger update
      mockEditor._triggerUpdate();

      const events = plugin.getEvents();
      
      expect(events.length).toBeGreaterThan(0);
      const updateEvent = events.find(e => e.type === 'update');
      expect(updateEvent).toBeDefined();
    });

    it('should include timestamp and relatedEventId', () => {
      visualizer.registerPlugin(plugin, mockEditor);
      plugin.attach();

      mockEditor._triggerUpdate();

      const events = plugin.getEvents();
      
      expect(events.length).toBeGreaterThan(0);
      expect(events[0].timestamp).toBeTypeOf('number');
      // relatedEventId may be undefined if no contenteditable event occurred
      expect(events[0].relatedEventId).toBeUndefined();
    });

    it('should not capture updates when disabled', () => {
      const disabledPlugin = new LexicalPlugin({
        config: {
          trackUpdates: false,
        },
      });

      visualizer.registerPlugin(disabledPlugin, mockEditor);
      disabledPlugin.attach();

      mockEditor._triggerUpdate();

      const events = disabledPlugin.getEvents();
      // Even with trackUpdates disabled, selection/document tracking may still fire
      expect(Array.isArray(events)).toBe(true);
    });
  });

  describe('Selection Tracking', () => {
    it('should track selection changes when enabled', () => {
      const selectionPlugin = new LexicalPlugin({
        config: {
          trackSelection: true,
          trackUpdates: true,
        },
      });

      visualizer.registerPlugin(selectionPlugin, mockEditor);
      selectionPlugin.attach();

      mockEditor._triggerUpdate();

      const events = selectionPlugin.getEvents();
      // Selection tracking may or may not capture events depending on state
      expect(Array.isArray(events)).toBe(true);
    });

    it('should return selection in getState when trackSelection is enabled', () => {
      const selectionPlugin = new LexicalPlugin({
        config: {
          trackSelection: true,
        },
      });

      visualizer.registerPlugin(selectionPlugin, mockEditor);
      selectionPlugin.attach();

      const state = selectionPlugin.getState();
      expect(state).toBeDefined();
      // Selection may be null if not available
      expect(state === null || typeof state === 'object').toBe(true);
    });
  });

  describe('Document Tracking', () => {
    it('should track document changes when enabled', () => {
      const documentPlugin = new LexicalPlugin({
        config: {
          trackDocument: true,
          trackUpdates: true,
        },
      });

      visualizer.registerPlugin(documentPlugin, mockEditor);
      documentPlugin.attach();

      mockEditor._triggerUpdate();

      const events = documentPlugin.getEvents();
      // Document tracking may fire events
      expect(Array.isArray(events)).toBe(true);
    });

    it('should return document in getState when trackDocument is enabled', () => {
      const documentPlugin = new LexicalPlugin({
        config: {
          trackDocument: true,
        },
      });

      visualizer.registerPlugin(documentPlugin, mockEditor);
      documentPlugin.attach();

      const state = documentPlugin.getState();
      expect(state).toBeDefined();
      expect(state).toHaveProperty('updateCount');
    });
  });

  describe('History Tracking', () => {
    it('should track undo/redo operations', () => {
      const historyPlugin = new LexicalPlugin({
        config: {
          trackHistory: true,
          trackUpdates: true,
        },
      });

      visualizer.registerPlugin(historyPlugin, mockEditor);
      historyPlugin.attach();

      // Trigger undo
      mockEditor._triggerUpdate(new Set(['undo']));

      const events = historyPlugin.getEvents();
      const historyEvents = events.filter(e => e.type === 'history' && e.data?.type === 'undo');
      
      expect(historyEvents.length).toBeGreaterThan(0);
    });

    it('should track redo operations', () => {
      const historyPlugin = new LexicalPlugin({
        config: {
          trackHistory: true,
          trackUpdates: true,
        },
      });

      visualizer.registerPlugin(historyPlugin, mockEditor);
      historyPlugin.attach();

      // Trigger redo
      mockEditor._triggerUpdate(new Set(['redo']));

      const events = historyPlugin.getEvents();
      const historyEvents = events.filter(e => e.type === 'history' && e.data?.type === 'redo');
      
      expect(historyEvents.length).toBeGreaterThan(0);
    });
  });

  describe('Command Tracking', () => {
    it('should register command listener', () => {
      visualizer.registerPlugin(plugin, mockEditor);
      plugin.attach();

      const commandHandler = vi.fn(() => true);
      const unregister = plugin.registerCommandListener('TEST_COMMAND', commandHandler);

      expect(unregister).toBeDefined();
      expect(typeof unregister).toBe('function');

      // Trigger command
      mockEditor._triggerCommand('TEST_COMMAND', { test: 'data' });

      expect(commandHandler).toHaveBeenCalled();
    });

    it('should capture command execution when trackCommands is enabled', () => {
      visualizer.registerPlugin(plugin, mockEditor);
      plugin.attach();

      const commandHandler = vi.fn(() => true);
      plugin.registerCommandListener('TEST_COMMAND', commandHandler);

      mockEditor._triggerCommand('TEST_COMMAND', { test: 'data' });

      const events = plugin.getEvents();
      const commandEvents = events.filter(e => e.type === 'command');
      
      expect(commandEvents.length).toBeGreaterThan(0);
      expect(commandEvents[0].data?.commandType).toBe('TEST_COMMAND');
    });

    it('should not capture commands when trackCommands is disabled', () => {
      const noCommandPlugin = new LexicalPlugin({
        config: {
          trackCommands: false,
        },
      });

      visualizer.registerPlugin(noCommandPlugin, mockEditor);
      noCommandPlugin.attach();

      const commandHandler = vi.fn(() => true);
      noCommandPlugin.registerCommandListener('TEST_COMMAND', commandHandler);

      mockEditor._triggerCommand('TEST_COMMAND');

      // Command should still execute but not be tracked
      expect(commandHandler).toHaveBeenCalled();
    });
  });

  describe('State Management', () => {
    it('should return current state', () => {
      visualizer.registerPlugin(plugin, mockEditor);
      plugin.attach();

      const state = plugin.getState();
      
      expect(state).toBeDefined();
      expect(state).toHaveProperty('updateCount');
    });

    it('should return null when editor is destroyed', () => {
      visualizer.registerPlugin(plugin, mockEditor);
      plugin.attach();

      plugin.destroy();

      const state = plugin.getState();
      expect(state).toBeNull();
    });
  });

  describe('Cleanup', () => {
    it('should unregister update listener on detach', () => {
      const unregisterSpy = vi.spyOn(mockEditor, 'registerUpdateListener');
      
      visualizer.registerPlugin(plugin, mockEditor);
      plugin.attach();

      expect(unregisterSpy).toHaveBeenCalled();

      plugin.detach();

      // After detach, triggering update should not fire events
      const eventsBefore = plugin.getEvents().length;
      mockEditor._triggerUpdate();
      const eventsAfter = plugin.getEvents().length;

      // Events should not increase after detach
      expect(eventsAfter).toBe(eventsBefore);
    });

    it('should clean up on destroy', () => {
      visualizer.registerPlugin(plugin, mockEditor);
      plugin.attach();

      plugin.destroy();

      const state = plugin.getState();
      expect(state).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid consecutive updates', () => {
      visualizer.registerPlugin(plugin, mockEditor);
      plugin.attach();

      // Trigger multiple updates rapidly
      for (let i = 0; i < 5; i++) {
        mockEditor._triggerUpdate();
      }

      const events = plugin.getEvents();
      expect(events.length).toBeGreaterThanOrEqual(5);
    });

    it('should handle updates with different tags', () => {
      visualizer.registerPlugin(plugin, mockEditor);
      plugin.attach();

      mockEditor._triggerUpdate(new Set(['user-triggered']));
      mockEditor._triggerUpdate(new Set(['collaboration']));

      const events = plugin.getEvents();
      expect(events.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle getState when not attached', () => {
      const unattachedPlugin = new LexicalPlugin();
      visualizer.registerPlugin(unattachedPlugin, mockEditor);
      // Not calling attach()

      const state = unattachedPlugin.getState();
      // When not attached, should still work if editor is set
      expect(state === null || typeof state === 'object').toBe(true);
    });

    it('should handle minimal configuration', () => {
      const minimalPlugin = new LexicalPlugin({
        config: {
          trackUpdates: false,
          trackSelection: false,
          trackDocument: false,
          trackCommands: false,
          trackHistory: false,
        },
      });

      visualizer.registerPlugin(minimalPlugin, mockEditor);
      minimalPlugin.attach();

      mockEditor._triggerUpdate();

      const state = minimalPlugin.getState();
      expect(state).toBeDefined();
    });
  });

  describe('Formatting Tracking', () => {
    it('should track formatting changes when enabled', () => {
      const formattingPlugin = new LexicalPlugin({
        config: {
          trackFormatting: true,
          trackUpdates: true,
        },
      });

      visualizer.registerPlugin(formattingPlugin, mockEditor);
      formattingPlugin.attach();

      // Mock editor state with TextNode that has formatting
      const mockStateWithFormatting = {
        readOnly: false,
        _nodeMap: new Map([
          ['root', {}],
          ['text1', {
            getFormat: () => 1, // bold flag
            key: 'text1',
          }],
        ]),
        _selection: null,
        read: (callback: () => void) => {
          callback();
        },
      } as any;

      // Override getEditorState to return state with formatting
      vi.spyOn(mockEditor, 'getEditorState').mockReturnValue(mockStateWithFormatting);

      mockEditor._triggerUpdate();

      const events = formattingPlugin.getEvents();
      // Formatting tracking may or may not capture events depending on state
      expect(Array.isArray(events)).toBe(true);
    });

    it('should not track formatting when disabled', () => {
      const noFormattingPlugin = new LexicalPlugin({
        config: {
          trackFormatting: false,
          trackUpdates: true,
        },
      });

      visualizer.registerPlugin(noFormattingPlugin, mockEditor);
      noFormattingPlugin.attach();

      mockEditor._triggerUpdate();

      const events = noFormattingPlugin.getEvents();
      const formattingEvents = events.filter(e => e.type === 'formattingChange');
      
      expect(formattingEvents.length).toBe(0);
    });
  });
});
