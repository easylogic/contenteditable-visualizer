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
const plugin = new ProseMirrorPlugin({
  config: {
    trackSteps: true,
    trackSelection: true,
    trackDocument: true,
    maxTransactionHistory: 100,
  },
});

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

### 2. Selection Changes

Monitors selection state changes:

- Selection position (from, to, anchor, head)
- Selection type (empty, text, node, etc.)
- Stored marks at selection

### 3. Document State

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
    maxTransactionHistory?: number;    // Max transactions to keep (default: 100)
  };
}
```

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

##### `getEvents(): TransactionData[]`

Get transaction history.

**Returns:** Array of transaction data objects:
```typescript
interface TransactionData {
  timestamp: number;            // When transaction occurred
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
  selectionChanged: boolean;  // Whether selection changed
}
```

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

### Full Transaction Tracking

```typescript
const plugin = new ProseMirrorPlugin({
  config: {
    trackSteps: true,
    trackSelection: true,
    trackDocument: true,
    maxTransactionHistory: 200,
  },
});

visualizer.registerPlugin(plugin, view);

// Get transaction history
const transactions = plugin.getEvents();
transactions.forEach(tr => {
  console.log(`Transaction at ${new Date(tr.timestamp).toISOString()}`);
  console.log(`  Steps: ${tr.steps.length}`);
  console.log(`  Doc changed: ${tr.docChanged}`);
  console.log(`  Selection changed: ${tr.selectionChanged}`);
});
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

### Selection State

When `trackSelection: true`, the plugin captures:

- Selection boundaries (from, to)
- Selection anchor and head
- Whether selection is empty
- Stored marks at selection

### Document State

When `trackDocument: true`, the plugin captures:

- Full document structure as JSON
- Document size
- Schema information

## Performance Considerations

- **Transaction History**: Limited by `maxTransactionHistory` (default: 100)
- **Document Tracking**: Can be memory-intensive for large documents. Only enable when needed.
- **Step Tracking**: Adds minimal overhead. Steps are serialized to JSON.

## Best Practices

1. **Enable Only What You Need**: Don't enable `trackDocument` unless you need full document state
2. **Limit History**: Set `maxTransactionHistory` based on your needs
3. **Use with Snapshots**: Combine plugin state with visualizer snapshots for comprehensive debugging
4. **Monitor Performance**: Transaction tracking adds minimal overhead, but document tracking can be expensive

## Troubleshooting

### Plugin not capturing transactions

- Ensure the plugin is registered before any transactions occur
- Check that `enabled: true` (default)
- Verify the EditorView instance is valid

### Missing transaction data

- Check that the relevant tracking options are enabled (`trackSteps`, `trackSelection`, `trackDocument`)
- Verify `maxTransactionHistory` is large enough

### Performance issues

- Disable `trackDocument` if not needed
- Reduce `maxTransactionHistory`
- Only enable `trackSteps` when debugging specific issues

## License

MIT

