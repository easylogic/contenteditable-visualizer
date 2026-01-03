# @contenteditable/prosemirror

ProseMirror plugin for [contenteditable-visualizer](https://github.com/easylogic/contenteditable-visualizer). Monitors ProseMirror transactions, state changes, and selection for debugging and analysis.

## Installation

```bash
npm install @contenteditable/prosemirror
# or
pnpm add @contenteditable/prosemirror
# or
yarn add @contenteditable/prosemirror
```

**Peer Dependencies:**
- `contenteditable-visualizer`
- `prosemirror-view`

## Quick Start

```typescript
import { createVisualizer } from 'contenteditable-visualizer';
import { ProseMirrorPlugin } from '@contenteditable/prosemirror';
import { EditorView } from 'prosemirror-view';

// Create your ProseMirror editor view
const view = new EditorView(dom, {
  state,
  // ... other options
});

// Create visualizer
const visualizer = createVisualizer(view.dom, {
  visualize: true,
  logEvents: true,
  container: document.body, // Use fixed positioning for ProseMirror
});

// Register ProseMirror plugin
// Important: You must pass the EditorView instance as the second argument
// This allows the plugin to monitor the specific ProseMirror instance
const plugin = new ProseMirrorPlugin({
  config: {
    trackSteps: true,
    trackSelection: true,
    trackDocument: true,
    trackViewUpdates: true,
    trackFocus: true,
    trackMarks: true,
    trackPluginStates: true,
    trackCommands: true,
    trackHistory: true,
    maxTransactionHistory: 100,
  },
});

// Register the plugin with the EditorView instance
// The plugin will monitor this specific EditorView instance
visualizer.registerPlugin(plugin, view);
```

## What This Plugin Monitors

### 1. Transactions

Tracks all ProseMirror transactions dispatched through `EditorView.dispatchTransaction()`:

- **Transaction Steps**: Each step in the transaction (insert, delete, replace, etc.)
  - Step type (e.g., `ReplaceStep`, `ReplaceAroundStep`)
  - From/to positions
  - Slice content (if available)
- **Transaction Metadata**: 
  - Timestamp
  - Time (transaction time from ProseMirror)
  - Stored marks
  - Custom meta properties
- **Change Detection**:
  - `docChanged`: Whether the document was modified
  - `selectionChanged`: Whether the selection was modified

### 2. View Updates

Monitors EditorView update events:

- Previous and current state comparison
- Document size changes
- Selection changes between states
- Transaction information in updates

### 3. Selection Changes

Monitors selection state changes independently:

- Selection position (from, to, anchor, head)
- Selection type (empty, text, node, etc.)
- Stored marks at selection
- Duplicate change filtering

### 4. Focus/Blur Events

Tracks editor focus state:

- Focus and blur events
- Selection state at focus/blur
- User interaction patterns

### 5. Mark Changes

Monitors mark (formatting) changes:

- Mark additions, removals, and updates
- Mark types and attributes
- Position where marks are applied

### 6. Plugin State Changes

Tracks state changes in all ProseMirror plugins:

- Previous and current plugin states
- Plugin-specific state changes
- Automatic detection of all registered plugins

### 7. Command Execution

Tracks command execution (requires application-level integration):

- Command name and arguments
- Success/failure status
- Generated transaction information

### 8. History State

Monitors undo/redo history:

- Undo/redo operations
- History depth information
- Can undo/redo status
- Automatic detection of history plugin

### 9. Document State

Captures document state snapshots:

- Full document JSON structure
- Document size and structure
- Current schema

## API Reference

### `ProseMirrorPlugin`

#### Constructor

```typescript
new ProseMirrorPlugin(options?: ProseMirrorPluginOptions)
```

**Options:**
```typescript
interface ProseMirrorPluginOptions {
  enabled?: boolean;  // Enable/disable plugin (default: true)
  config?: {
    trackSteps?: boolean;              // Track transaction steps (default: false)
    trackSelection?: boolean;          // Track selection changes (default: true)
    trackDocument?: boolean;           // Track document state (default: false)
    trackViewUpdates?: boolean;        // Track view update events (default: false)
    trackFocus?: boolean;              // Track focus/blur events (default: false)
    trackMarks?: boolean;              // Track mark changes (default: false)
    trackPluginStates?: boolean;       // Track plugin state changes (default: false)
    trackCommands?: boolean;           // Track command execution (default: false)
    trackHistory?: boolean;            // Track history state (default: false)
    maxTransactionHistory?: number;    // Max events to keep (default: 100)
  };
}
```

#### Plugin Registration

**Important**: After creating the plugin, you must register it with the visualizer and pass the `EditorView` instance:

```typescript
// Create the plugin
const plugin = new ProseMirrorPlugin({ config: { ... } });

// Register with the EditorView instance
// The second argument MUST be the ProseMirror EditorView instance
// This allows the plugin to monitor transactions, state changes, and events
// from this specific editor instance
visualizer.registerPlugin(plugin, view);
```

**Why pass the EditorView instance?**
- The plugin needs direct access to the `EditorView` to:
  - Wrap `dispatchTransaction` to capture transactions
  - Monitor view updates
  - Track selection changes
  - Access editor state and plugins
- Without the `EditorView` instance, the plugin cannot monitor your specific editor

#### Methods

##### `getState(): ProseMirrorState | null`

Get current ProseMirror editor state.

**Returns:**
```typescript
{
  doc?: any;                    // Document JSON (if trackDocument enabled)
  selection?: {                 // Selection info (if trackSelection enabled)
    from: number;
    to: number;
    anchor: number;
    head: number;
    empty: boolean;
  };
  storedMarks?: any;            // Stored marks
  transactionCount: number;     // Number of transactions captured
}
```

##### `getEvents(): PluginEvent[]`

Get all editor events (transactions, view updates, selection changes, etc.).

**Returns:** Array of event objects with different types:
```typescript
interface PluginEvent {
  type: string;                // Event type: 'transaction', 'viewUpdate', 'selectionChange', 'focus', 'markChange', 'pluginStateChange', 'command', 'history'
  timestamp: number;           // When event occurred
  relatedEventId?: number;     // Related contenteditable event ID
  data: any;                   // Event-specific data
}

// Transaction event data
interface TransactionData {
  steps: Array<{                // Transaction steps (if trackSteps enabled)
    stepType: string;
    from: number;
    to: number;
    slice?: any;
  }>;
  time?: number;               // ProseMirror transaction time
  storedMarks?: any;           // Stored marks
  meta?: Record<string, any>;  // Custom metadata
  docChanged: boolean;         // Whether document changed
  selectionChanged: boolean;   // Whether selection changed
}

// View update event data
interface ViewUpdateData {
  prevState?: {                // Previous state
    docSize: number;
    selection: { from: number; to: number; anchor: number; head: number; };
  };
  newState?: {                 // New state
    docSize: number;
    selection: { from: number; to: number; anchor: number; head: number; };
  };
  docChanged: boolean;
  selectionChanged: boolean;
}

// Selection change event data
interface SelectionChangeData {
  from: number;
  to: number;
  anchor: number;
  head: number;
  empty: boolean;
  storedMarks?: any;
  selectionType?: string;
}

// Focus event data
interface FocusEventData {
  type: 'focus' | 'blur';
  hasSelection: boolean;
  selection?: { from: number; to: number; };
}

// Mark change event data
interface MarkChangeData {
  type: 'add' | 'remove' | 'update';
  marks: Array<{ type: string; attrs: any; }>;
  position?: { from: number; to: number; };
}

// Plugin state change event data
interface PluginStateChangeData {
  pluginKey: string;
  prevState?: any;
  newState?: any;
  changed: boolean;
}

// Command event data
interface CommandData {
  commandName: string;
  args?: any[];
  success: boolean;
  transaction?: {
    steps: number;
    docChanged: boolean;
    selectionChanged: boolean;
  };
}

// History event data
interface HistoryStateData {
  type: 'undo' | 'redo' | 'clear';
  canUndo: boolean;
  canRedo: boolean;
  undoDepth?: number;
  redoDepth?: number;
}
```

##### `captureCommand(commandName: string, args: any[], success: boolean, transaction?: any): void`

Manually capture a command execution. This should be called from your application code when commands are executed.

**Parameters:**
- `commandName`: Name of the command
- `args`: Command arguments
- `success`: Whether the command succeeded
- `transaction`: Optional transaction created by the command

## Usage Examples

### Basic Monitoring

```typescript
import { ProseMirrorPlugin } from '@contenteditable/prosemirror';

const plugin = new ProseMirrorPlugin({
  config: {
    trackSelection: true,
  },
});

visualizer.registerPlugin(plugin, view);

// Get current state
const state = plugin.getState();
console.log('Selection:', state?.selection);
```

### Full Event Tracking

```typescript
const plugin = new ProseMirrorPlugin({
  config: {
    trackSteps: true,
    trackSelection: true,
    trackDocument: true,
    trackViewUpdates: true,
    trackFocus: true,
    trackMarks: true,
    trackPluginStates: true,
    trackHistory: true,
    maxTransactionHistory: 200,
  },
});

visualizer.registerPlugin(plugin, view);

// Get all events
const events = plugin.getEvents();
events.forEach(event => {
  console.log(`${event.type} at ${new Date(event.timestamp).toISOString()}`);
  
  if (event.type === 'transaction') {
    const data = event.data as TransactionData;
    console.log(`  Steps: ${data.steps.length}`);
    console.log(`  Doc changed: ${data.docChanged}`);
    console.log(`  Selection changed: ${data.selectionChanged}`);
  } else if (event.type === 'selectionChange') {
    const data = event.data as SelectionChangeData;
    console.log(`  From: ${data.from}, To: ${data.to}`);
  } else if (event.type === 'history') {
    const data = event.data as HistoryStateData;
    console.log(`  Type: ${data.type}, Can undo: ${data.canUndo}, Can redo: ${data.canRedo}`);
  }
});
```

### Command Tracking

```typescript
const plugin = new ProseMirrorPlugin({
  config: {
    trackCommands: true,
  },
});

visualizer.registerPlugin(plugin, view);

// Wrap your commands to track execution
function wrapCommand(commandName: string, command: any) {
  return (state: any, dispatch: any, view: any) => {
    const result = command(state, dispatch, view);
    if (result && dispatch) {
      // Capture command after transaction is created
      plugin.captureCommand(commandName, [], true, state.tr);
    }
    return result;
  };
}

// Use wrapped commands
const boldCommand = wrapCommand('toggleBold', toggleStrong);
```

### Integration with Snapshots

```typescript
// Capture snapshot with ProseMirror state
const snapshot = await visualizer.captureSnapshot('manual', 'Debugging issue');

// Get snapshot
const snapshot = await visualizer.getSnapshot(snapshotId);

// Plugin state is available in snapshot
const prosemirrorPlugin = visualizer.getPlugin('prosemirror');
if (prosemirrorPlugin) {
  const state = prosemirrorPlugin.getState();
  const transactions = prosemirrorPlugin.getEvents();
  
  console.log('ProseMirror state:', state);
  console.log('Recent transactions:', transactions.slice(-5));
}
```

## What Gets Captured

### Transaction Steps

When `trackSteps: true`, the plugin captures:

- **Step Types**: `ReplaceStep`, `ReplaceAroundStep`, `AddMarkStep`, `RemoveMarkStep`, etc.
- **Positions**: From/to positions for each step
- **Content**: Slice content (when available)

### View Updates

When `trackViewUpdates: true`, the plugin captures:

- Previous and current document size
- Selection changes between updates
- Document and selection change flags
- Transaction information in the update

### Selection State

When `trackSelection: true`, the plugin captures:

- Selection boundaries (from, to)
- Selection anchor and head
- Whether selection is empty
- Stored marks at selection
- Selection type (TextSelection, NodeSelection, etc.)

### Focus/Blur Events

When `trackFocus: true`, the plugin captures:

- Focus and blur event types
- Selection state at the time of focus/blur
- User interaction patterns

### Mark Changes

When `trackMarks: true`, the plugin captures:

- Mark type (add, remove, update)
- Mark types and attributes
- Position where marks are applied

### Plugin State Changes

When `trackPluginStates: true`, the plugin captures:

- All registered plugin states
- Previous and current state comparison
- Plugin-specific state changes

### Command Execution

When `trackCommands: true`, the plugin captures (via `captureCommand()`):

- Command name and arguments
- Success/failure status
- Generated transaction information

### History State

When `trackHistory: true`, the plugin captures:

- Undo/redo operations
- History depth (undo/redo depth)
- Can undo/redo status
- Automatic detection of history plugin

### Document State

When `trackDocument: true`, the plugin captures:

- Full document structure as JSON
- Document size
- Schema information

## Performance Considerations

- **Event History**: Limited by `maxTransactionHistory` (default: 100) for all event types
- **Document Tracking**: Can be memory-intensive for large documents. Only enable when needed.
- **Step Tracking**: Adds minimal overhead. Steps are serialized to JSON.
- **View Updates**: Minimal overhead, tracks state changes efficiently
- **Plugin State Tracking**: Can be expensive if plugins have large state objects. Monitor performance.
- **Command Tracking**: No overhead if not used. Requires manual integration.
- **History Tracking**: Minimal overhead, only tracks when history plugin is present.

## Best Practices

1. **Enable Only What You Need**: 
   - Don't enable `trackDocument` unless you need full document state
   - Enable `trackViewUpdates` for comprehensive state change tracking
   - Use `trackPluginStates` only when debugging plugin-specific issues
   - Enable `trackHistory` when debugging undo/redo issues

2. **Limit History**: Set `maxTransactionHistory` based on your needs (applies to all event types)

3. **Use with Snapshots**: Combine plugin state with visualizer snapshots for comprehensive debugging

4. **Monitor Performance**: 
   - Transaction and view update tracking adds minimal overhead
   - Document tracking can be expensive for large documents
   - Plugin state tracking depends on plugin state size

5. **Command Tracking**: 
   - Wrap commands at the application level for command tracking
   - Use `captureCommand()` after transaction is created
   - Consider tracking only specific commands for performance

6. **Event Filtering**: 
   - All events are linked to contenteditable events via `relatedEventId`
   - Use this to correlate editor events with DOM events

## Troubleshooting

### Plugin not capturing transactions

- **Ensure the plugin is registered correctly**: You must call `visualizer.registerPlugin(plugin, view)` with the `EditorView` instance
- **Verify the EditorView instance**: The second argument to `registerPlugin()` must be a valid ProseMirror `EditorView` instance
- Ensure the plugin is registered before any transactions occur
- Check that `enabled: true` (default)
- Verify the EditorView instance is valid and has `dispatchTransaction` method

### Plugin not monitoring editor

- **Check registration**: Make sure you called `visualizer.registerPlugin(plugin, view)` with the correct `EditorView` instance
- **Verify instance**: The plugin monitors the specific `EditorView` instance you pass to `registerPlugin()`
- If you have multiple editors, each needs its own plugin instance registered with its own `EditorView`

### Missing event data

- Check that the relevant tracking options are enabled
- Verify `maxTransactionHistory` is large enough
- For command tracking, ensure `captureCommand()` is called from your application code
- For history tracking, ensure history plugin is registered in your ProseMirror state

### Performance issues

- Disable `trackDocument` if not needed
- Reduce `maxTransactionHistory`
- Only enable `trackSteps` when debugging specific issues
- Disable `trackPluginStates` if plugin states are large
- Consider disabling `trackViewUpdates` if you only need transaction tracking

## License

MIT

