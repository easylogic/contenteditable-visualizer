# @contenteditable/slate

Slate.js plugin for [contenteditable-visualizer](https://github.com/easylogic/contenteditable-visualizer). Monitors Slate.js operations, editor changes, and selection for debugging and analysis.

## Installation

```bash
npm install @contenteditable/slate
# or
pnpm add @contenteditable/slate
# or
yarn add @contenteditable/slate
```

**Peer Dependencies:**
- `contenteditable-visualizer`
- `slate`

## Quick Start

```typescript
import { createVisualizer } from 'contenteditable-visualizer';
import { SlatePlugin } from '@contenteditable/slate';
import { createEditor } from 'slate';

// Create your Slate editor
const editor = createEditor();
const editorElement = document.querySelector('[data-slate-editor]');

// Create visualizer
const visualizer = createVisualizer(editorElement, {
  visualize: true,
  logEvents: true,
});

// Register Slate plugin
const plugin = new SlatePlugin({
  config: {
    trackOperations: true,
    trackSelection: true,
    trackHistory: true,
    maxOperationHistory: 100,
  },
});

visualizer.registerPlugin(plugin, editor);
```

## What This Plugin Monitors

### 1. Operations

Tracks all Slate.js operations through the editor's `onChange` callback:

- **Operation Types**: `insert_text`, `remove_text`, `insert_node`, `remove_node`, `split_node`, `merge_node`, `move_node`, `set_node`, `set_selection`, etc.
- **Operation Data**:
  - Operation type
  - Path (location in document)
  - Properties (old properties)
  - New properties (new properties)
  - Node data (when applicable)
  - Offset and text (for text operations)
- **Timestamps**: When each operation occurred

### 2. Selection Changes

Monitors selection state changes:

- Current selection (anchor, focus, path)
- Selection type (range, point, null)
- Selection properties

### 3. Document State

Captures document state snapshots:

- Full document children structure
- Current editor state
- Node hierarchy

## API Reference

### `SlatePlugin`

#### Constructor

```typescript
new SlatePlugin(options?: SlatePluginOptions)
```

**Options:**
```typescript
interface SlatePluginOptions {
  enabled?: boolean;  // Enable/disable plugin (default: true)
  config?: {
    trackOperations?: boolean;        // Track operations (default: true)
    trackSelection?: boolean;          // Track selection changes (default: true)
    trackHistory?: boolean;           // Track history (default: false)
    maxOperationHistory?: number;     // Max operations to keep (default: 100)
  };
}
```

#### Methods

##### `getState(): SlateState | null`

Get current Slate editor state.

**Returns:**
```typescript
{
  children?: any[];           // Document children (if trackDocument enabled)
  selection?: any;            // Selection info (if trackSelection enabled)
  operationCount: number;     // Number of operations captured
}
```

##### `getEvents(): OperationData[]`

Get operation history.

**Returns:** Array of operation data objects:
```typescript
interface OperationData {
  timestamp: number;          // When operation occurred
  type: string;              // Operation type
  path?: number[];           // Path in document
  properties?: any;          // Old properties
  newProperties?: any;       // New properties
  node?: any;                // Node data
  offset?: number;           // Offset (for text operations)
  text?: string;            // Text (for text operations)
}
```

## Usage Examples

### Basic Monitoring

```typescript
import { SlatePlugin } from '@contenteditable/slate';

const plugin = new SlatePlugin({
  config: {
    trackSelection: true,
  },
});

visualizer.registerPlugin(plugin, editor);

// Get current state
const state = plugin.getState();
console.log('Selection:', state?.selection);
```

### Full Operation Tracking

```typescript
const plugin = new SlatePlugin({
  config: {
    trackOperations: true,
    trackSelection: true,
    trackDocument: true,
    maxOperationHistory: 200,
  },
});

visualizer.registerPlugin(plugin, editor);

// Get operation history
const operations = plugin.getEvents();
operations.forEach(op => {
  console.log(`Operation: ${op.type} at path ${op.path}`);
  if (op.type === 'insert_text' || op.type === 'remove_text') {
    console.log(`  Text: "${op.text}"`);
  }
});
```

### Integration with Snapshots

```typescript
// Capture snapshot with Slate state
const snapshotId = await visualizer.captureSnapshot('manual', 'Debugging issue');

// Get snapshot
const snapshot = await visualizer.getSnapshot(snapshotId);

// Plugin state is available in snapshot
const slatePlugin = visualizer.getPlugin('slate');
if (slatePlugin) {
  const state = slatePlugin.getState();
  const operations = slatePlugin.getEvents();
  
  console.log('Slate state:', state);
  console.log('Recent operations:', operations.slice(-5));
}
```

## What Gets Captured

### Operations

When `trackOperations: true`, the plugin captures:

- **Text Operations**: `insert_text`, `remove_text`
  - Text content
  - Offset position
  - Path in document
- **Node Operations**: `insert_node`, `remove_node`, `split_node`, `merge_node`, `move_node`, `set_node`
  - Node data
  - Path information
  - Properties (old and new)
- **Selection Operations**: `set_selection`
  - Selection data
  - Anchor and focus points

### Selection State

When `trackSelection: true`, the plugin captures:

- Selection anchor and focus
- Selection path
- Selection type (range, point, null)

### Document State

When `trackDocument: true`, the plugin captures:

- Full document children structure
- Node hierarchy
- Current editor state

## Performance Considerations

- **Operation History**: Limited by `maxOperationHistory` (default: 100)
- **Document Tracking**: Can be memory-intensive for large documents. Only enable when needed.
- **Operation Tracking**: Adds minimal overhead. Operations are captured synchronously.

## Best Practices

1. **Enable Only What You Need**: Don't enable `trackDocument` unless you need full document state
2. **Limit History**: Set `maxOperationHistory` based on your needs
3. **Use with Snapshots**: Combine plugin state with visualizer snapshots for comprehensive debugging
4. **Monitor Performance**: Operation tracking adds minimal overhead, but document tracking can be expensive

## Troubleshooting

### Plugin not capturing operations

- Ensure the plugin is registered before any operations occur
- Check that `enabled: true` (default)
- Verify the Editor instance is valid and has `onChange` method

### Missing operation data

- Check that `trackOperations: true` is enabled
- Verify `maxOperationHistory` is large enough
- Ensure operations are being dispatched through the editor's `onChange`

### Performance issues

- Disable `trackDocument` if not needed
- Reduce `maxOperationHistory`
- Only enable `trackOperations` when debugging specific issues

## License

MIT

