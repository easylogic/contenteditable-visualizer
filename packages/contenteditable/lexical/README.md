# @contenteditable/lexical

Lexical plugin for [contenteditable-visualizer](https://github.com/easylogic/contenteditable-visualizer). Monitors Lexical editor updates, commands, and state changes for debugging and analysis.

## Installation

```bash
npm install @contenteditable/lexical
# or
pnpm add @contenteditable/lexical
# or
yarn add @contenteditable/lexical
```

**Peer Dependencies:**
- `contenteditable-visualizer`
- `lexical`

## Quick Start

```typescript
import { createVisualizer } from 'contenteditable-visualizer';
import { LexicalPlugin } from '@contenteditable/lexical';
import { createEditor } from 'lexical';

// Create your Lexical editor
const editor = createEditor({
  namespace: 'MyEditor',
  nodes: [],
  onError: (error) => console.error(error),
});

const editorElement = document.querySelector('[data-lexical-editor]');

// Create visualizer
const visualizer = createVisualizer(editorElement, {
  visualize: true,
  logEvents: true,
});

// Register Lexical plugin
const plugin = new LexicalPlugin({
  config: {
    trackUpdates: true,
    trackSelection: true,
    trackDocument: true,
    trackCommands: true,
    trackHistory: true,
    maxUpdateHistory: 100,
  },
});

visualizer.registerPlugin(plugin, editor);
```

## What This Plugin Monitors

### 1. Editor Updates

Tracks all Lexical editor state updates through `registerUpdateListener`:

- **Update Events**: Captured whenever editor state changes
- **Update Tags**: Tracks update tags (e.g., 'user-triggered', 'collaboration', 'undo', 'redo')
- **Editor State**: Captures read-only state and other state properties
- **Timestamps**: When each update occurred

### 2. Selection Changes

Monitors selection state changes:

- Current selection (anchor, focus, collapsed state)
- Selection type (RangeSelection, NodeSelection, etc.)
- Selection properties

### 3. Document State

Captures document state snapshots:

- Node count in editor state
- Root node presence
- Document structure

### 4. Command Execution

Tracks command execution through `registerCommandListener`:

- Command type
- Command payload
- Execution timestamps

### 5. History State

Monitors undo/redo operations:

- Undo operations (when 'undo' tag is present)
- Redo operations (when 'redo' tag is present)
- History state changes

## API Reference

### `LexicalPlugin`

#### Constructor

```typescript
new LexicalPlugin(options?: LexicalPluginOptions)
```

**Options:**
```typescript
interface LexicalPluginOptions {
  enabled?: boolean;  // Enable/disable plugin (default: true)
  config?: {
    trackUpdates?: boolean;        // Track editor updates (default: true)
    trackSelection?: boolean;       // Track selection changes (default: false)
    trackDocument?: boolean;        // Track document changes (default: false)
    trackCommands?: boolean;        // Track command execution (default: false)
    trackHistory?: boolean;          // Track history (default: false)
    maxUpdateHistory?: number;       // Max updates to keep (default: 100)
  };
}
```

#### Methods

##### `getState(): LexicalState | null`

Get current Lexical editor state.

**Returns:**
```typescript
{
  updateCount: number;        // Number of updates captured
  selection?: {               // Selection info (if trackSelection enabled)
    type: string;
    anchor: any;
    focus: any;
    isCollapsed: boolean;
  };
  document?: {                // Document info (if trackDocument enabled)
    nodeCount: number;
    hasRoot: boolean;
  };
}
```

##### `getEvents(): (UpdateData | CommandData)[]`

Get update and command history.

**Returns:** Array of event data objects:
```typescript
interface UpdateData {
  timestamp: number;          // When update occurred
  relatedEventId?: number;    // Related contenteditable event ID
  tags?: Set<string>;         // Update tags
  editorState?: {
    readOnly?: boolean;
  };
}

interface CommandData {
  timestamp: number;
  relatedEventId?: number;
  commandType: string;
  payload?: any;
}
```

##### `registerCommandListener(commandType: string, handler: (payload?: any) => boolean): () => void`

Register a command listener to track command execution.

**Parameters:**
- `commandType`: The command type to listen for
- `handler`: The command handler function

**Returns:** Unregister function

**Example:**
```typescript
const unregister = plugin.registerCommandListener('INSERT_TEXT', (payload) => {
  // Handle command
  return true;
});

// Later, unregister
unregister();
```

## Usage Examples

### Basic Monitoring

```typescript
import { LexicalPlugin } from '@contenteditable/lexical';

const plugin = new LexicalPlugin({
  config: {
    trackUpdates: true,
  },
});

visualizer.registerPlugin(plugin, editor);

// Get current state
const state = plugin.getState();
console.log('Update count:', state?.updateCount);
```

### Full Feature Tracking

```typescript
const plugin = new LexicalPlugin({
  config: {
    trackUpdates: true,
    trackSelection: true,
    trackDocument: true,
    trackCommands: true,
    trackHistory: true,
    maxUpdateHistory: 200,
  },
});

visualizer.registerPlugin(plugin, editor);

// Track custom commands
plugin.registerCommandListener('CUSTOM_COMMAND', (payload) => {
  console.log('Custom command executed:', payload);
  return true;
});
```

### Command Tracking

```typescript
const plugin = new LexicalPlugin({
  config: {
    trackCommands: true,
  },
});

visualizer.registerPlugin(plugin, editor);

// Register command listeners
plugin.registerCommandListener('INSERT_TEXT', (payload) => {
  // Your command logic
  return true;
});

plugin.registerCommandListener('DELETE_TEXT', (payload) => {
  // Your command logic
  return true;
});

// Get command history
const events = plugin.getEvents();
const commands = events.filter(e => 'commandType' in e);
console.log('Commands executed:', commands);
```

## What Gets Captured

### Update Events

When `trackUpdates` is enabled, the plugin captures:
- Update timestamps
- Update tags (Set of strings)
- Editor state properties (readOnly, etc.)
- Related contenteditable event IDs (when available)

### Selection Events

When `trackSelection` is enabled, the plugin captures:
- Selection type (RangeSelection, NodeSelection, etc.)
- Anchor and focus positions
- Collapsed state

### Document Events

When `trackDocument` is enabled, the plugin captures:
- Node count in editor state
- Root node presence

### Command Events

When `trackCommands` is enabled and commands are registered via `registerCommandListener`, the plugin captures:
- Command type
- Command payload
- Execution timestamp

### History Events

When `trackHistory` is enabled, the plugin captures:
- Undo operations (when 'undo' tag is present in update)
- Redo operations (when 'redo' tag is present in update)

## Performance Considerations

- **Update Listener**: The plugin registers a single update listener that captures all editor updates. This is efficient and doesn't add significant overhead.
- **Event Storage**: Events are stored in memory with a configurable limit (`maxUpdateHistory`). Default is 100 events.
- **Selection/Document Tracking**: These features read editor state, which may have minimal performance impact. Disable if not needed.

## Best Practices

1. **Enable Only What You Need**: Disable tracking features you don't use to reduce overhead.
2. **Command Tracking**: Use `registerCommandListener` to track specific commands you care about, rather than tracking all commands.
3. **Event Limits**: Set `maxUpdateHistory` appropriately based on your debugging needs.
4. **Error Handling**: The plugin handles errors gracefully to avoid breaking editor functionality.

## Troubleshooting

### Plugin Not Capturing Updates

- Ensure `trackUpdates` is not set to `false`
- Verify the Lexical editor instance is valid
- Check that `attach()` was called (usually automatic when visualizer is attached)

### Commands Not Being Tracked

- Ensure `trackCommands` is enabled in config
- Verify commands are registered via `registerCommandListener`
- Check that command handlers return `true` to indicate success

### Selection/Document Not Captured

- Ensure `trackSelection` or `trackDocument` is enabled
- Verify editor state is accessible (may fail silently if state is not available)

## License

MIT
