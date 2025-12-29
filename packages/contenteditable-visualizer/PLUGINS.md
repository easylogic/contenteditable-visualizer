# Plugin System Guide

This guide provides detailed information about creating and using plugins for the contenteditable-visualizer SDK.

## Table of Contents

- [Overview](#overview)
- [Plugin Architecture](#plugin-architecture)
- [Plugin Interface](#plugin-interface)
- [BasePlugin Class](#baseplugin-class)
- [Plugin Lifecycle](#plugin-lifecycle)
- [Creating a Plugin](#creating-a-plugin)
- [Plugin Registration](#plugin-registration)
- [Advanced Topics](#advanced-topics)
- [Best Practices](#best-practices)
- [Examples](#examples)

## Overview

The plugin system allows you to extend the visualizer with editor-specific functionality. Plugins can:

- Monitor editor-specific state changes (e.g., ProseMirror transactions, Slate operations)
- Track editor events that aren't captured by standard DOM events
- Provide editor state snapshots for AI prompt generation
- Integrate with visualizer lifecycle (attach/detach/destroy)
- Access visualizer instance for advanced integrations

### When to Use Plugins

Use plugins when you need to:

1. **Track Editor-Specific Events**: Monitor framework-specific events (e.g., ProseMirror transactions, Slate operations)
2. **Capture Editor State**: Include editor state in snapshots for debugging
3. **Integrate with Editor APIs**: Access editor-specific APIs and methods
4. **Custom Monitoring**: Implement custom monitoring logic beyond DOM events

### Plugin vs. Standard Events

The visualizer already captures standard DOM events (`beforeinput`, `input`, `composition*`, `selectionchange`). Plugins are for editor-specific events and state that aren't available through standard DOM APIs.

## Plugin Architecture

```
┌─────────────────────────────────────────────────────────┐
│              ContentEditableVisualizer                   │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │         Plugin Registry (Map<string, Plugin>)   │   │
│  └──────────────────────────────────────────────────┘   │
│                          │                               │
│                          ▼                               │
│  ┌──────────────────────────────────────────────────┐   │
│  │              Plugin Lifecycle Manager            │   │
│  │  - initialize()                                  │   │
│  │  - attach() / detach()                           │   │
│  │  - destroy()                                     │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                          │
                          │ manages
                          ▼
┌─────────────────────────────────────────────────────────┐
│                    VisualizerPlugin                      │
│  (interface that all plugins must implement)             │
└─────────────────────────────────────────────────────────┘
                          ▲
                          │ implements
                          │
┌─────────────────────────────────────────────────────────┐
│                    BasePlugin                            │
│  (abstract base class with lifecycle management)         │
└─────────────────────────────────────────────────────────┘
                          ▲
                          │ extends
                          │
              ┌───────────┴───────────┐
              │                       │
    ┌─────────▼─────────┐   ┌─────────▼─────────┐
    │  ProseMirrorPlugin │   │   SlatePlugin     │
    │  (example)         │   │   (example)       │
    └────────────────────┘   └──────────────────┘
```

## Plugin Interface

All plugins must implement the `VisualizerPlugin` interface:

```typescript
interface VisualizerPlugin {
  readonly metadata: PluginMetadata;
  initialize(editor: any, visualizer: ContentEditableVisualizer): void;
  attach(): void;
  detach(): void;
  getState?(): any;
  getEvents?(): any[];
  destroy(): void;
}
```

### PluginMetadata

Every plugin must provide metadata:

```typescript
interface PluginMetadata {
  id: string;              // Unique identifier (e.g., 'prosemirror', 'slate')
  name: string;            // Human-readable name
  version: string;         // Semantic version (e.g., '1.0.0')
  editor: string;          // Editor framework identifier
  description?: string;    // Optional description
}
```

**Example:**
```typescript
readonly metadata: PluginMetadata = {
  id: 'my-editor-plugin',
  name: 'My Editor Plugin',
  version: '1.0.0',
  editor: 'my-editor',
  description: 'Monitors My Editor state and events',
};
```

### Required Methods

#### `initialize(editor: any, visualizer: ContentEditableVisualizer): void`

Called when the plugin is registered. Sets up references to the editor and visualizer instances.

**Parameters:**
- `editor` - The editor instance (type depends on editor framework)
- `visualizer` - The visualizer instance

**When called:** Immediately when `registerPlugin()` is invoked

**Purpose:** Store references, validate editor instance, set up initial state

#### `attach(): void`

Called when the plugin should start monitoring. Set up event listeners, observers, etc.

**When called:**
- Immediately if visualizer is already attached
- When visualizer is attached (if plugin was registered before attachment)

**Purpose:** Start monitoring editor state and events

#### `detach(): void`

Called when the plugin should stop monitoring. Clean up event listeners, observers, etc.

**When called:**
- When visualizer is detached
- Before plugin is destroyed

**Purpose:** Stop monitoring, but keep plugin registered

#### `destroy(): void`

Called when the plugin is being removed. Perform final cleanup.

**When called:**
- When `unregisterPlugin()` is called
- When visualizer is destroyed

**Purpose:** Final cleanup, release all resources

### Optional Methods

#### `getState?(): any`

Return current editor state. Used for snapshots and debugging.

**Returns:** Editor-specific state object (or `null` if not available)

**When called:** By visualizer when creating snapshots, or manually by user

#### `getEvents?(): any[]`

Return editor events since last snapshot or since attachment.

**Returns:** Array of editor events (or empty array)

**When called:** By visualizer when creating snapshots, or manually by user

## BasePlugin Class

The `BasePlugin` abstract class provides a foundation with built-in lifecycle management:

```typescript
export abstract class BasePlugin implements VisualizerPlugin {
  protected visualizer: ContentEditableVisualizer | null = null;
  protected editor: any = null;
  protected attached: boolean = false;
  protected options: PluginOptions;

  abstract readonly metadata: PluginMetadata;

  constructor(options: PluginOptions = {}) {
    this.options = {
      enabled: true,
      ...options,
    };
  }

  // Implemented by BasePlugin
  initialize(editor: any, visualizer: ContentEditableVisualizer): void;
  attach(): void;
  detach(): void;
  destroy(): void;

  // Override in subclasses
  protected onInitialize(): void;
  protected onAttach(): void;
  protected onDetach(): void;
  protected onDestroy(): void;

  // Optional - override if needed
  getState?(): any;
  getEvents?(): any[];
}
```

### Protected Properties

- `visualizer` - Reference to the visualizer instance (set after `initialize`)
- `editor` - Reference to the editor instance (set after `initialize`)
- `attached` - Whether the plugin is currently attached
- `options` - Plugin configuration options

### Protected Methods (Override in Subclasses)

- `onInitialize()` - Called after `initialize()` completes
- `onAttach()` - Called when plugin should start monitoring
- `onDetach()` - Called when plugin should stop monitoring
- `onDestroy()` - Called during final cleanup

### Benefits of Using BasePlugin

1. **Automatic Lifecycle Management**: BasePlugin handles the lifecycle automatically
2. **Enabled/Disabled State**: Built-in support for `enabled` option
3. **State Tracking**: Tracks `attached` state automatically
4. **Error Prevention**: Prevents double-attachment, attachment when not initialized, etc.

## Plugin Lifecycle

Plugins follow a specific lifecycle that aligns with the visualizer:

```
┌─────────────┐
│  Created    │  new MyPlugin()
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Initialize  │  registerPlugin(plugin, editor)
│             │  → initialize(editor, visualizer)
│             │  → onInitialize()
└──────┬──────┘
       │
       ├─────────────────┐
       │                 │
       ▼                 ▼
┌─────────────┐   ┌─────────────┐
│   Attached  │   │  Detached   │
│             │   │             │
│ attach()    │◄──┤ detach()    │
│ → onAttach()│   │ → onDetach()│
└──────┬──────┘   └──────┬──────┘
       │                 │
       │                 │
       └────────┬────────┘
                │
                ▼
         ┌─────────────┐
         │  Destroyed  │
         │             │
         │ destroy()   │
         │ → onDestroy()│
         └─────────────┘
```

### Lifecycle States

1. **Created**: Plugin instance created, not yet registered
2. **Initialized**: Plugin registered, references set up
3. **Attached**: Plugin monitoring editor (if visualizer is attached)
4. **Detached**: Plugin not monitoring (but still registered)
5. **Destroyed**: Plugin removed, all resources cleaned up

### Lifecycle Hooks

```typescript
class MyPlugin extends BasePlugin {
  protected onInitialize(): void {
    // Called once after initialize()
    // Editor and visualizer references are available
    // Set up initial state, validate editor, etc.
  }

  protected onAttach(): void {
    // Called when plugin should start monitoring
    // Set up event listeners, observers, timers, etc.
  }

  protected onDetach(): void {
    // Called when plugin should stop monitoring
    // Remove event listeners, observers, timers, etc.
    // Plugin remains registered
  }

  protected onDestroy(): void {
    // Called during final cleanup
    // Release all resources, clear state
    // Plugin cannot be reused after this
  }
}
```

## Creating a Plugin

### Step 1: Define Plugin Metadata

```typescript
class MyEditorPlugin extends BasePlugin {
  readonly metadata: PluginMetadata = {
    id: 'my-editor',
    name: 'My Editor Plugin',
    version: '1.0.0',
    editor: 'my-editor',
    description: 'Monitors My Editor state and events',
  };
}
```

### Step 2: Define Plugin Options (Optional)

```typescript
interface MyPluginOptions extends PluginOptions {
  config?: {
    trackHistory?: boolean;
    maxHistorySize?: number;
    trackSelection?: boolean;
  };
}

class MyEditorPlugin extends BasePlugin {
  constructor(options: MyPluginOptions = {}) {
    super(options);
  }
}
```

### Step 3: Implement Lifecycle Hooks

```typescript
class MyEditorPlugin extends BasePlugin {
  private eventHistory: any[] = [];
  private handlers: Map<string, Function> = new Map();

  protected onInitialize(): void {
    // Validate editor instance
    if (!this.editor || typeof this.editor.on !== 'function') {
      throw new Error('Invalid editor instance');
    }

    // Initialize based on options
    const config = this.options.config || {};
    // ... setup
  }

  protected onAttach(): void {
    if (!this.editor) return;

    // Set up event listeners
    const changeHandler = (event: any) => {
      this.eventHistory.push({
        timestamp: Date.now(),
        type: 'change',
        data: event,
      });

      // Limit history size
      const maxSize = this.options.config?.maxHistorySize ?? 100;
      if (this.eventHistory.length > maxSize) {
        this.eventHistory.shift();
      }
    };

    this.editor.on('change', changeHandler);
    this.handlers.set('change', changeHandler);
  }

  protected onDetach(): void {
    if (!this.editor) return;

    // Remove all event listeners
    this.handlers.forEach((handler, event) => {
      this.editor!.off(event, handler);
    });
    this.handlers.clear();
  }

  protected onDestroy(): void {
    // Ensure we're detached
    this.onDetach();
    
    // Clear state
    this.eventHistory = [];
  }
}
```

### Step 4: Implement Optional Methods

```typescript
class MyEditorPlugin extends BasePlugin {
  getState(): any {
    if (!this.editor) return null;

    return {
      editorState: this.editor.getState(),
      eventCount: this.eventHistory.length,
      lastEvent: this.eventHistory[this.eventHistory.length - 1] || null,
    };
  }

  getEvents(): any[] {
    return this.eventHistory.slice();
  }
}
```

### Complete Example

```typescript
import { BasePlugin } from 'contenteditable-visualizer';
import type { PluginMetadata, PluginOptions } from 'contenteditable-visualizer';
import type { ContentEditableVisualizer } from 'contenteditable-visualizer';

interface MyEditor {
  on(event: string, handler: Function): void;
  off(event: string, handler: Function): void;
  getState(): { content: string; selection: any };
  getHistory(): any[];
}

interface MyPluginOptions extends PluginOptions {
  config?: {
    trackHistory?: boolean;
    maxHistorySize?: number;
  };
}

class MyEditorPlugin extends BasePlugin {
  readonly metadata: PluginMetadata = {
    id: 'my-editor',
    name: 'My Editor Plugin',
    version: '1.0.0',
    editor: 'my-editor',
    description: 'Monitors My Editor state and events',
  };

  private editor: MyEditor | null = null;
  private eventHistory: any[] = [];
  private handlers: Map<string, Function> = new Map();

  constructor(options: MyPluginOptions = {}) {
    super(options);
  }

  protected onInitialize(): void {
    this.editor = this.editor as MyEditor;
    
    if (!this.editor || typeof this.editor.on !== 'function') {
      throw new Error('MyEditorPlugin: Invalid editor instance');
    }
  }

  protected onAttach(): void {
    if (!this.editor) return;

    const changeHandler = (event: any) => {
      if (!this.options.config?.trackHistory) return;

      this.eventHistory.push({
        timestamp: Date.now(),
        type: 'change',
        data: event,
      });

      const maxSize = this.options.config?.maxHistorySize ?? 100;
      if (this.eventHistory.length > maxSize) {
        this.eventHistory.shift();
      }
    };

    this.editor.on('change', changeHandler);
    this.handlers.set('change', changeHandler);
  }

  protected onDetach(): void {
    if (!this.editor) return;

    this.handlers.forEach((handler, event) => {
      this.editor!.off(event, handler);
    });
    this.handlers.clear();
  }

  protected onDestroy(): void {
    this.onDetach();
    this.eventHistory = [];
    this.editor = null;
  }

  getState(): any {
    if (!this.editor) return null;

    return {
      editorState: this.editor.getState(),
      eventCount: this.eventHistory.length,
    };
  }

  getEvents(): any[] {
    return this.eventHistory.slice();
  }
}
```

## Plugin Registration

### Registering a Plugin

```typescript
const visualizer = createVisualizer(editorElement);
const plugin = new MyEditorPlugin({
  enabled: true,
  config: {
    trackHistory: true,
    maxHistorySize: 50,
  },
});

// Register the plugin
visualizer.registerPlugin(plugin, myEditorInstance);
```

**What happens:**
1. Plugin's `initialize()` is called with editor and visualizer
2. If visualizer is already attached, plugin's `attach()` is called immediately
3. Plugin is stored in the plugin registry

### Getting a Plugin

```typescript
// Get by ID
const plugin = visualizer.getPlugin('my-editor');
if (plugin) {
  const state = plugin.getState?.();
}

// Get all plugins
const plugins = visualizer.getPlugins();
plugins.forEach(plugin => {
  console.log(plugin.metadata.name);
});
```

### Unregistering a Plugin

```typescript
// Unregister by ID
visualizer.unregisterPlugin('my-editor');
```

**What happens:**
1. Plugin's `detach()` is called
2. Plugin's `destroy()` is called
3. Plugin is removed from registry

### Automatic Lifecycle Management

Plugins are automatically managed based on visualizer state:

- **Visualizer attached**: All registered plugins are attached
- **Visualizer detached**: All registered plugins are detached
- **Visualizer destroyed**: All registered plugins are destroyed

## Advanced Topics

### Accessing Visualizer from Plugin

Plugins have access to the visualizer instance for advanced integrations:

```typescript
protected onAttach(): void {
  if (!this.visualizer) return;

  // Access visualizer methods
  const logs = this.visualizer.getEventLogs();
  const snapshots = await this.visualizer.getSnapshots();

  // Trigger snapshots programmatically
  await this.visualizer.captureSnapshot('plugin', 'Plugin triggered snapshot');

  // Monitor visualizer events
  this.visualizer.onEvent((log) => {
    if (log.type === 'input') {
      // React to input events
    }
  });
}
```

### Plugin-to-Plugin Communication

Plugins can communicate through the visualizer:

```typescript
protected onAttach(): void {
  if (!this.visualizer) return;

  // Get other plugins
  const otherPlugin = this.visualizer.getPlugin('other-plugin-id');
  if (otherPlugin) {
    const otherState = otherPlugin.getState?.();
    // Use other plugin's state
  }
}
```

### Error Handling

Always handle errors in plugin methods:

```typescript
protected onAttach(): void {
  try {
    // Your attachment logic
    if (!this.editor) {
      throw new Error('Editor not initialized');
    }
    // ...
  } catch (error) {
    console.error(`[${this.metadata.id}] Failed to attach:`, error);
    // Optionally notify visualizer
    if (this.visualizer && this.visualizer.options.onError) {
      this.visualizer.options.onError(error, 'plugin.attach');
    }
  }
}
```

### Memory Management

Prevent memory leaks:

```typescript
class MyPlugin extends BasePlugin {
  private timers: Set<number> = new Set();
  private observers: Set<ResizeObserver> = new Set();

  protected onAttach(): void {
    // Store timer IDs
    const timerId = window.setInterval(() => {
      // ...
    }, 1000);
    this.timers.add(timerId);

    // Store observers
    const observer = new ResizeObserver(() => {
      // ...
    });
    observer.observe(this.editor.dom);
    this.observers.add(observer);
  }

  protected onDetach(): void {
    // Clear all timers
    this.timers.forEach(id => clearInterval(id));
    this.timers.clear();

    // Disconnect all observers
    this.observers.forEach(obs => obs.disconnect());
    this.observers.clear();
  }
}
```

### Type Safety

Use TypeScript for type safety:

```typescript
interface MyEditor {
  on(event: 'change' | 'selection', handler: Function): void;
  off(event: 'change' | 'selection', handler: Function): void;
  getState(): MyEditorState;
}

interface MyEditorState {
  content: string;
  selection: { from: number; to: number };
}

class MyPlugin extends BasePlugin {
  private editor: MyEditor | null = null;

  protected onInitialize(): void {
    this.editor = this.editor as MyEditor;
    // TypeScript will now provide autocomplete and type checking
  }

  getState(): MyEditorState | null {
    return this.editor?.getState() || null;
  }
}
```

## Best Practices

### 1. Always Clean Up Resources

```typescript
protected onDetach(): void {
  // Remove event listeners
  // Clear timers
  // Disconnect observers
  // Cancel pending requests
}
```

### 2. Validate Editor Instance

```typescript
protected onInitialize(): void {
  if (!this.editor) {
    throw new Error('Editor instance required');
  }
  
  // Validate editor has required methods
  if (typeof this.editor.on !== 'function') {
    throw new Error('Editor must have on() method');
  }
}
```

### 3. Limit History/Event Arrays

```typescript
private eventHistory: any[] = [];

protected onAttach(): void {
  const handler = (event: any) => {
    this.eventHistory.push(event);
    
    // Limit size
    const maxSize = 100;
    if (this.eventHistory.length > maxSize) {
      this.eventHistory.shift();
    }
  };
}
```

### 4. Use Options for Configuration

```typescript
interface MyPluginOptions extends PluginOptions {
  config?: {
    enabled?: boolean;
    maxSize?: number;
  };
}

class MyPlugin extends BasePlugin {
  constructor(options: MyPluginOptions = {}) {
    super(options);
  }

  protected onAttach(): void {
    const config = this.options.config || {};
    const maxSize = config.maxSize ?? 100;
    // Use config values
  }
}
```

### 5. Handle Disabled State

```typescript
protected onAttach(): void {
  // BasePlugin already checks this.options.enabled
  // But you can add additional checks
  if (!this.options.enabled) {
    return;
  }
  // ...
}
```

### 6. Provide Meaningful State

```typescript
getState(): any {
  if (!this.editor) return null;

  return {
    // Include relevant editor state
    editorState: this.editor.getState(),
    
    // Include plugin-specific state
    eventCount: this.eventHistory.length,
    lastEventTime: this.eventHistory[this.eventHistory.length - 1]?.timestamp || null,
    
    // Include configuration
    config: this.options.config,
  };
}
```

### 7. Document Your Plugin

```typescript
/**
 * MyEditorPlugin
 * 
 * Monitors My Editor state and events.
 * 
 * @example
 * ```typescript
 * const plugin = new MyEditorPlugin({
 *   config: {
 *     trackHistory: true,
 *     maxHistorySize: 50,
 *   },
 * });
 * visualizer.registerPlugin(plugin, myEditorInstance);
 * ```
 */
class MyEditorPlugin extends BasePlugin {
  // ...
}
```

## Examples

### Example 1: Simple Event Tracker

```typescript
class SimpleEventTracker extends BasePlugin {
  readonly metadata: PluginMetadata = {
    id: 'simple-tracker',
    name: 'Simple Event Tracker',
    version: '1.0.0',
    editor: 'generic',
  };

  private events: any[] = [];

  protected onAttach(): void {
    if (!this.editor) return;
    
    const handler = (event: any) => {
      this.events.push({
        timestamp: Date.now(),
        event,
      });
    };

    this.editor.addEventListener('change', handler);
  }

  protected onDetach(): void {
    if (!this.editor) return;
    this.editor.removeEventListener('change', handler);
  }

  getEvents(): any[] {
    return this.events.slice();
  }
}
```

### Example 2: State Snapshot Plugin

```typescript
class StateSnapshotPlugin extends BasePlugin {
  readonly metadata: PluginMetadata = {
    id: 'state-snapshot',
    name: 'State Snapshot Plugin',
    version: '1.0.0',
    editor: 'generic',
  };

  private stateHistory: any[] = [];
  private maxHistorySize = 10;

  protected onAttach(): void {
    if (!this.visualizer) return;

    // Capture state on every snapshot
    this.visualizer.onEvent((log) => {
      if (log.type === 'input') {
        const state = this.getState();
        if (state) {
          this.stateHistory.push({
            timestamp: Date.now(),
            state,
          });

          if (this.stateHistory.length > this.maxHistorySize) {
            this.stateHistory.shift();
          }
        }
      }
    });
  }

  getState(): any {
    if (!this.editor) return null;
    return this.editor.getState?.() || null;
  }

  getStateHistory(): any[] {
    return this.stateHistory.slice();
  }
}
```

### Example 3: Performance Monitor Plugin

```typescript
interface PerformanceMetrics {
  eventCount: number;
  averageEventInterval: number;
  lastEventTime: number | null;
}

class PerformanceMonitorPlugin extends BasePlugin {
  readonly metadata: PluginMetadata = {
    id: 'performance-monitor',
    name: 'Performance Monitor',
    version: '1.0.0',
    editor: 'generic',
  };

  private eventTimes: number[] = [];
  private maxSamples = 100;

  protected onAttach(): void {
    if (!this.visualizer) return;

    this.visualizer.onEvent(() => {
      const now = Date.now();
      this.eventTimes.push(now);

      if (this.eventTimes.length > this.maxSamples) {
        this.eventTimes.shift();
      }
    });
  }

  getState(): PerformanceMetrics {
    const times = this.eventTimes;
    if (times.length < 2) {
      return {
        eventCount: times.length,
        averageEventInterval: 0,
        lastEventTime: times[times.length - 1] || null,
      };
    }

    const intervals: number[] = [];
    for (let i = 1; i < times.length; i++) {
      intervals.push(times[i] - times[i - 1]);
    }

    const averageInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;

    return {
      eventCount: times.length,
      averageEventInterval: averageInterval,
      lastEventTime: times[times.length - 1],
    };
  }
}
```

## Summary

- **Plugins extend** the visualizer with editor-specific functionality
- **BasePlugin** provides lifecycle management and common patterns
- **Lifecycle hooks** (`onInitialize`, `onAttach`, `onDetach`, `onDestroy`) allow customization
- **Plugin registration** is simple: `visualizer.registerPlugin(plugin, editor)`
- **Always clean up** resources in `onDetach()` and `onDestroy()`
- **Use TypeScript** for type safety and better developer experience
- **Limit memory usage** by capping history/event arrays
- **Handle errors** gracefully in all plugin methods

For more information, see the main [README.md](./README.md) file.

