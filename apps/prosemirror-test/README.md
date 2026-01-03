# ProseMirror Test App

This is a test application for the ContentEditable Visualizer with ProseMirror integration.

## Overview

This app demonstrates how to use the `contenteditable-visualizer` with ProseMirror editor. It includes:

- Full ProseMirror editor setup
- ProseMirror plugin integration
- Event tracking and visualization
- Snapshot capture and export
- Plugin state monitoring

## Features

### Editor Features

- Rich text editing with ProseMirror
- Basic formatting (bold, italic)
- Lists (ordered and unordered)
- History (undo/redo)
- Keyboard shortcuts

### Visualizer Features

- **Event Logging**: Tracks all contenteditable events (beforeinput, input, composition, selection)
- **Range Visualization**: Visual overlays for selection, composition, and input ranges
- **DOM Change Tracking**: Detects and visualizes text node changes
- **Snapshot Management**: Capture and store editor state snapshots
- **Floating Panel**: Interactive UI for viewing events, snapshots, and document structure

### ProseMirror Plugin Features

- **Transaction Tracking**: Monitors all ProseMirror transactions
- **Selection Tracking**: Tracks selection changes and stored marks
- **View Updates**: Captures EditorView state changes
- **Document Structure**: Provides document structure view in Structure tab
- **Command Tracking**: Tracks executed commands (when wrapped)
- **History State**: Monitors undo/redo history

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm

### Installation

```bash
# Install dependencies
pnpm install

# Start the dev server
pnpm --filter prosemirror-test dev
```

Or from the root:

```bash
pnpm test:prosemirror
```

The app will be available at `http://localhost:5173` (or the next available port).

## Usage

### Basic Usage

1. **Type in the editor**: Start typing to see events being logged
2. **Open the panel**: Click the floating button (🔍) in the bottom-right corner
3. **View events**: Check the "Events" tab to see all logged events
4. **View snapshots**: Check the "Snapshots" tab to see captured snapshots
5. **View structure**: Check the "Structure" tab to see ProseMirror document structure

### Buttons

- **Capture Snapshot**: Manually capture a snapshot of the current editor state
- **Clear Events**: Clear all logged events
- **Export Data**: Export all data (events, snapshots, plugin state) as JSON
- **Show ProseMirror State**: Display plugin state in console and alert

### Plugin Configuration

The ProseMirror plugin is configured with:

```typescript
const prosemirrorPlugin = new ProseMirrorPlugin({
  config: {
    trackSteps: true,        // Track transaction steps
    trackSelection: true,     // Track selection changes
    trackDocument: true,      // Track document structure
    maxTransactionHistory: 100, // Maximum stored transactions
  },
});
```

## Testing

### Manual Testing

1. Type various text inputs
2. Use keyboard shortcuts (Ctrl+B for bold, etc.)
3. Select text and replace it
4. Use IME composition (for non-English input)
5. Check the floating panel for logged events
6. Capture snapshots at different states
7. Export data and inspect the JSON

### E2E Testing

Run Playwright tests:

```bash
# Run all E2E tests
pnpm test:e2e

# Run with UI
pnpm test:e2e:ui

# Debug mode
pnpm test:e2e:debug
```

## Exported Data Structure

When you export data, you'll get a JSON file containing:

```json
{
  "eventLogs": [...],      // All contenteditable events
  "snapshots": [...],      // All captured snapshots
  "prosemirror": {
    "state": {...},        // Current ProseMirror plugin state
    "events": [...]        // All ProseMirror plugin events
  }
}
```

## Troubleshooting

### Plugin not showing in Structure tab

- Ensure `trackDocument: true` is set in plugin config
- Check browser console for errors
- Verify the plugin is properly registered: `visualizer.registerPlugin(plugin, view)`

### Events not being logged

- Check that `logEvents: true` is set in visualizer options
- Verify the editor element is contenteditable
- Check browser console for errors

### Snapshot capture fails

- Check browser console for IndexedDB errors
- Ensure browser supports IndexedDB
- Try clearing browser storage

## Learn More

- [ContentEditable Visualizer Documentation](../../packages/contenteditable-visualizer/README.md)
- [ProseMirror Plugin Documentation](../../packages/contenteditable/prosemirror/README.md)
- [ProseMirror Official Docs](https://prosemirror.net/)
