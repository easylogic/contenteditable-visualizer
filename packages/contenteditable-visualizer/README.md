# contenteditable-visualizer

SDK for visualizing and tracking contenteditable events, ranges, and DOM changes. Works with any editor (ProseMirror, Slate.js, Editor.js, Lexical, etc.) without React dependencies.

## Features

- 🎯 **Range Visualization** - Visualize selection, composition, beforeinput, and input ranges with SVG overlays
- 📊 **DOM Change Tracking** - Track text node changes (added, deleted, modified, moved) in real-time
- 📝 **Event Logging** - Capture all contenteditable events with detailed information (beforeinput, input, composition events, selection changes)
- 📸 **Snapshot Management** - Capture and store snapshots with IndexedDB for debugging and analysis
- 🤖 **AI Prompt Generation** - Automatically generate structured prompts from snapshots for AI analysis
- 🎨 **Floating UI Panel** - Built-in event viewer and snapshot history viewer with toggle button and resizing support
- 🔍 **Invisible Character Visualization** - Visualize zero-width spaces, line feeds, tabs, and other invisible characters
- 📍 **Boundary Markers** - Visual indicators when selection is at text node or element boundaries
- 🔌 **Framework Agnostic** - Pure TypeScript/DOM API, no React or other framework dependencies
- ⚡ **Performance Optimized** - Throttled selection changes, configurable log limits, efficient DOM tracking
- 🎨 **Customizable** - Custom color schemes, panel sizing, container options, and error handling callbacks

## Installation

```bash
npm install contenteditable-visualizer
# or
pnpm add contenteditable-visualizer
# or
yarn add contenteditable-visualizer
```

## Quick Start

```typescript
import { createVisualizer } from 'contenteditable-visualizer';

const editorElement = document.querySelector('[contenteditable]');
const visualizer = createVisualizer(editorElement, {
  visualize: true,
  logEvents: true,
  snapshots: true,
  panel: true,
});

// Capture a snapshot manually
await visualizer.captureSnapshot('manual', 'User triggered snapshot');

// Get event logs
const events = visualizer.getEventLogs();

// Export all data
const data = await visualizer.exportData();
console.log(data);

// Clean up when done
visualizer.destroy();
```

## API Reference

### `createVisualizer(element, options?)`

Creates a new visualizer instance and attaches it to the specified element.

**Parameters:**
- `element` (HTMLElement) - The contenteditable element to attach the visualizer to
- `options` (ContentEditableVisualizerOptions, optional) - Configuration options

**Returns:** `ContentEditableVisualizer` instance

**Throws:** `Error` if element is not a valid HTMLElement

### Options

#### Core Options

- `visualize` (boolean, default: `true`) - Enable range visualization overlay
- `logEvents` (boolean, default: `true`) - Enable event logging
- `snapshots` (boolean, default: `true`) - Enable snapshot management functionality
- `panel` (boolean, default: `true`) - Show floating UI panel with event viewer and snapshot history

#### Panel Options

- `panel` (boolean | FloatingPanelConfig, default: `true`) - Show floating panel or panel configuration
  - `boolean` - Enable/disable panel
  - `FloatingPanelConfig` object:
    - `position` (`'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'`, default: `'bottom-right'`) - Panel position
    - `theme` (`'light' | 'dark' | 'auto'`, default: `'auto'`) - Panel theme (auto detects system preference)
    - `container` (HTMLElement, optional) - Container to append the panel to (default: `document.body`)
    - `resizable` (boolean, default: `true`) - Enable panel resizing
    - `toggleButtonSize` (number, default: `48`) - Toggle button size in pixels
    - `panelWidth` (number, default: `500`) - Initial panel width in pixels
    - `panelHeight` (number, default: `600`) - Initial panel height in pixels
    - `panelMinWidth` (number, default: `300`) - Minimum panel width in pixels
    - `panelMinHeight` (number, default: `200`) - Minimum panel height in pixels
    - `panelMaxWidth` (number | string, default: `'90vw'`) - Maximum panel width
    - `panelMaxHeight` (number | string, default: `'90vh'`) - Maximum panel height

#### Snapshot Options

- `autoSnapshot` (boolean, default: `false`) - Automatically capture snapshots on input events

#### Performance Options

- `maxLogs` (number, default: `1000`) - Maximum number of event logs to keep (0 = unlimited)
- `throttleSelection` (number, default: `100`) - Throttle delay for selectionchange events in milliseconds

#### Customization Options

- `container` (HTMLElement, optional) - Container for the visualization overlay (default: element itself). Use `document.body` for fixed positioning.
- `colors` (VisualizerColorScheme, optional) - Custom color scheme for visualizations
  ```typescript
  {
    selection?: { fill?: string; stroke?: string };
    composition?: { fill?: string; stroke?: string };
    beforeinput?: { fill?: string; stroke?: string };
    input?: { fill?: string; stroke?: string };
    deleted?: { fill?: string; stroke?: string };
    added?: { fill?: string; stroke?: string };
  }
  ```
- `sizes` (VisualizerSizeOptions, optional) - Custom size options (for future use)
- `onError` ((error: Error, context: string) => void, optional) - Error callback function

### Methods

#### Event Logging

##### `getEventLogs(): EventLog[]`

Get all logged events.

**Returns:** Array of event logs

##### `clearEventLogs(): void`

Clear all event logs.

##### `onEvent(callback: (log: EventLog) => void): () => void`

Register a callback for new events. The callback is called whenever a new event is logged.

**Parameters:**
- `callback` - Function to call when a new event is logged

**Returns:** Unsubscribe function to remove the callback

**Example:**
```typescript
const unsubscribe = visualizer.onEvent((log) => {
  console.log('New event:', log);
});

// Later, to unsubscribe:
unsubscribe();
```

#### Snapshot Management

##### `captureSnapshot(trigger?, triggerDetail?): Promise<number>`

Manually capture a snapshot of the current editor state.

**Parameters:**
- `trigger` (SnapshotTrigger, optional) - Trigger type (e.g., `'manual'`, `'auto'`, `'custom'`)
- `triggerDetail` (string, optional) - Description of what triggered the snapshot

**Returns:** Promise that resolves to the snapshot ID

**Throws:** `Error` if snapshots are not enabled

**Example:**
```typescript
const snapshotId = await visualizer.captureSnapshot('manual', 'User clicked save button');
console.log('Snapshot ID:', snapshotId);
```

##### `getSnapshots(): Promise<Snapshot[]>`

Get all stored snapshots.

**Returns:** Promise that resolves to an array of snapshots

##### `getSnapshot(id: number): Promise<Snapshot | null>`

Get a specific snapshot by ID.

**Parameters:**
- `id` - The snapshot ID

**Returns:** Promise that resolves to the snapshot or null if not found

##### `deleteSnapshot(id: number): Promise<void>`

Delete a snapshot by ID.

**Parameters:**
- `id` - The snapshot ID to delete

**Throws:** `Error` if deletion fails

##### `clearSnapshots(): Promise<void>`

Clear all stored snapshots.

**Throws:** `Error` if clearing fails

#### Visualization

##### `showVisualization(enabled: boolean): void`

Enable or disable visualization dynamically.

**Parameters:**
- `enabled` - Whether to enable visualization

**Example:**
```typescript
// Disable visualization
visualizer.showVisualization(false);

// Re-enable visualization
visualizer.showVisualization(true);
```

#### Data Export

##### `exportData(): Promise<ExportData>`

Export all events and snapshots as JSON.

**Returns:** Promise that resolves to export data object containing:
- `events` - Serialized event logs
- `snapshots` - All stored snapshots
- `environment` - Environment information (OS, browser, device)

**Example:**
```typescript
const data = await visualizer.exportData();
const json = JSON.stringify(data, null, 2);

// Download as file
const blob = new Blob([json], { type: 'application/json' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = `visualizer-export-${Date.now()}.json`;
a.click();
URL.revokeObjectURL(url);
```

#### Lifecycle

##### `detach(): void`

Detach event listeners and clean up resources. The visualizer can be reattached later by calling methods that require attachment.

**Note:** This does not remove DOM elements. Use `destroy()` for complete cleanup.

##### `destroy(): void`

Completely remove the visualizer and all UI elements. This:
- Removes all event listeners
- Destroys the range visualizer
- Destroys the floating panel
- Removes the overlay element
- Cleans up ResizeObserver and scroll handlers

**Example:**
```typescript
// When unmounting or cleaning up
visualizer.destroy();
```

## Usage Examples

### Basic Usage

```typescript
import { createVisualizer } from 'contenteditable-visualizer';

const editorElement = document.getElementById('editor');
const visualizer = createVisualizer(editorElement);
```

### Custom Configuration

```typescript
const visualizer = createVisualizer(editorElement, {
  visualize: true,
  logEvents: true,
  snapshots: true,
  panel: {
    position: 'top-right',
    theme: 'dark',
    resizable: true,
    panelWidth: 600,
    panelHeight: 700,
  },
  autoSnapshot: false,
  maxLogs: 500,
  throttleSelection: 150,
  colors: {
    selection: {
      fill: 'rgba(59, 130, 246, 0.2)',
      stroke: 'rgba(59, 130, 246, 0.8)',
    },
    input: {
      fill: 'rgba(16, 185, 129, 0.2)',
      stroke: 'rgba(16, 185, 129, 0.8)',
    },
  },
  onError: (error, context) => {
    console.error(`Visualizer error in ${context}:`, error);
  },
});
```

### Without Floating Panel

```typescript
const visualizer = createVisualizer(editorElement, {
  panel: false,
});

// Use your own UI to display events
visualizer.onEvent((log) => {
  console.log('New event:', log);
  // Update your custom UI
});
```

### Fixed Overlay Container

```typescript
// Attach overlay to document.body for fixed positioning
const visualizer = createVisualizer(editorElement, {
  container: document.body,
});
```

### Integration with ProseMirror

```typescript
import { EditorView } from 'prosemirror-view';
import { createVisualizer } from 'contenteditable-visualizer';

const view = new EditorView(dom, {
  state,
  // ... other options
});

// Attach visualizer to the editor's DOM
const visualizer = createVisualizer(view.dom, {
  visualize: true,
  logEvents: true,
  container: document.body, // Use fixed positioning for ProseMirror
});
```

### Integration with Slate.js

```typescript
import { createEditor } from 'slate';
import { createVisualizer } from 'contenteditable-visualizer';

const editor = createEditor();
const editorElement = document.querySelector('[data-slate-editor]');

const visualizer = createVisualizer(editorElement, {
  visualize: true,
  logEvents: true,
});
```

### Integration with Editor.js

```typescript
import EditorJS from '@editorjs/editorjs';
import { createVisualizer } from 'contenteditable-visualizer';

const editor = new EditorJS({
  holder: 'editorjs',
});

editor.isReady.then(() => {
  const contentEditable = document.querySelector('[contenteditable]');
  const visualizer = createVisualizer(contentEditable, {
    visualize: true,
    logEvents: true,
  });
});
```

### Event Monitoring

```typescript
const visualizer = createVisualizer(editorElement);

// Monitor all events
visualizer.onEvent((log) => {
  switch (log.type) {
    case 'beforeinput':
      console.log('Before input:', log.event.inputType);
      break;
    case 'input':
      console.log('Input:', log.event.inputType);
      break;
    case 'compositionstart':
      console.log('IME composition started');
      break;
    case 'selectionchange':
      console.log('Selection changed');
      break;
  }
});
```

### Snapshot Workflow

```typescript
const visualizer = createVisualizer(editorElement, {
  snapshots: true,
  autoSnapshot: false, // Manual snapshots only
});

// Capture snapshot on specific condition
if (shouldCaptureSnapshot) {
  const id = await visualizer.captureSnapshot('custom', 'Important state change');
  console.log('Captured snapshot:', id);
}

// Get all snapshots
const snapshots = await visualizer.getSnapshots();
console.log('Total snapshots:', snapshots.length);

// Export for analysis
const data = await visualizer.exportData();
```

## Event Types

The visualizer captures the following events:

- **`beforeinput`** - Fired before input is processed. Includes `getTargetRanges()` information.
- **`input`** - Fired after input is processed. Includes DOM change detection results.
- **`compositionstart`** - IME composition started (for languages like Japanese, Chinese, Korean).
- **`compositionupdate`** - IME composition updated.
- **`compositionend`** - IME composition ended.
- **`selectionchange`** - Selection changed (throttled for performance).

## Snapshot Structure

Each snapshot includes:

- `id` - Unique snapshot ID
- `timestamp` - When the snapshot was captured (ISO 8601 string)
- `trigger` - What triggered the snapshot (`'manual'`, `'auto'`, or custom string)
- `triggerDetail` - Optional description of the trigger
- `environment` - Environment information:
  - `os` - Operating system name
  - `osVersion` - OS version
  - `browser` - Browser name
  - `browserVersion` - Browser version
  - `device` - Device type
  - `isMobile` - Whether running on mobile device
- `eventLogs` - All events captured up to that point
- `domBefore` - DOM state before (if captured)
- `domAfter` - DOM state after
- `ranges` - Selection and composition ranges at snapshot time
- `domChangeResult` - Detected DOM changes (if available)

## Type Definitions

### EventLog

```typescript
type EventLog = {
  type: 'beforeinput' | 'input' | 'compositionstart' | 'compositionupdate' | 'compositionend' | 'selectionchange';
  timestamp: number;
  event: Event; // Original event object
  range: Range | null; // Selection range at event time
  // Additional properties depending on event type
};
```

### Snapshot

```typescript
type Snapshot = {
  id: number;
  timestamp: string;
  trigger: string;
  triggerDetail?: string;
  environment: {
    os: string;
    osVersion: string;
    browser: string;
    browserVersion: string;
    device: string;
    isMobile: boolean;
  };
  eventLogs: EventLog[];
  domBefore?: any;
  domAfter: any;
  ranges?: any;
  domChangeResult?: DomChangeResult;
};
```

### ExportData

```typescript
type ExportData = {
  events: any[];
  snapshots: Snapshot[];
  environment: {
    os: string;
    osVersion: string;
    browser: string;
    browserVersion: string;
    device: string;
    isMobile: boolean;
  };
};
```

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

**Note:** Requires modern browser features:
- IndexedDB (for snapshot storage)
- ResizeObserver (for editor resize handling)
- `getTargetRanges()` API (for beforeinput events)

### Browser-Specific Behavior

ContentEditable behavior, especially for `contenteditable="false"` elements, may vary between browsers:

- **Chrome/Edge**: Generally consistent behavior. `contenteditable="false"` elements can be `startContainer`/`endContainer` in Range API.
- **Firefox**: Similar to Chrome, but may handle edge cases differently.
- **Safari**: May have different behavior, especially on iOS devices.
- **Mobile browsers**: Additional variations due to different input methods and touch handling.

**Important**: The SDK captures environment information (OS, browser, device) in snapshots to help identify browser-specific issues. Always test your implementation across different browsers and devices.

## Performance Considerations

- **Selection Change Throttling**: Selection change events are throttled by default (100ms) to avoid performance issues. Adjust with `throttleSelection` option.
- **Log Limits**: Event logs are limited to 1000 by default. Set `maxLogs` to 0 for unlimited (not recommended for long sessions).
- **DOM Tracking**: Text node tracking uses efficient TreeWalker API and WeakMap for memory management.
- **Overlay Rendering**: SVG overlay is efficiently updated only when ranges change.

## Advanced Features

### Invisible Character Visualization

The visualizer automatically detects and visualizes invisible characters in the selection:
- **ZWNBSP** (Zero-Width Non-Breaking Space, `\uFEFF`) - Red diamond
- **LF** (Line Feed, `\n`) - Blue diamond
- **CR** (Carriage Return, `\r`) - Cyan diamond
- **TAB** (Tab, `\t`) - Purple diamond
- **ZWSP** (Zero-Width Space, `\u200B`) - Pink diamond
- **ZWNJ** (Zero-Width Non-Joiner, `\u200C`) - Rose diamond
- **ZWJ** (Zero-Width Joiner, `\u200D`) - Fuchsia diamond

Each invisible character is marked with a colored diamond at the top of its bounding box, with a dashed line extending downward.

### Boundary Markers

When a selection (collapsed or non-collapsed) is at a text node or element boundary, visual markers are displayed:
- **Start boundary**: Orange triangle pointing downward (above the text)
- **End boundary**: Orange triangle pointing upward (below the text)

This helps identify when the cursor or selection is at the edge of a text node or element.

### AI Prompt Generation

Snapshots automatically include AI prompts that can be used for debugging and analysis. The prompt includes:
- HTML structure of the editor
- Event logs leading up to the snapshot
- DOM changes detected
- Range information
- Environment details

Access the AI prompt from the snapshot detail view in the floating panel, or via the `aiPrompt` field in the snapshot object.

### Panel Resizing

The floating panel supports drag-to-resize functionality:
- Drag the resize handle (bottom-right corner) to adjust panel size
- Minimum and maximum sizes are configurable via `FloatingPanelConfig`
- Panel size is maintained across sessions

## Troubleshooting

### Overlay not visible

- Ensure the editor element has `position: relative` or use `container: document.body` option
- Check that `visualize: true` is set
- Verify the element is actually contenteditable

### Events not logging

- Check that `logEvents: true` is set
- Verify the element is receiving events (check browser console)
- Ensure the element is properly attached to the DOM

### Snapshots not saving

- Check that `snapshots: true` is set
- Verify IndexedDB is available in your browser
- Check browser console for errors

### Performance issues

- Reduce `maxLogs` to limit memory usage
- Increase `throttleSelection` delay
- Disable visualization if not needed: `visualize: false`
- Disable floating panel if not needed: `panel: false`

## License

MIT
