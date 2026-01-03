# Lexical Test App

This is a test application for the ContentEditable Visualizer with Lexical integration.

## Overview

This app demonstrates how to use the `contenteditable-visualizer` with Lexical editor. It includes:

- Lexical editor instance creation
- Lexical plugin integration
- Event tracking and visualization
- Snapshot capture and export
- Plugin state monitoring

## Features

### Editor Features

- Rich text editing with Lexical
- Document structure tracking
- Update and command monitoring

### Visualizer Features

- **Event Logging**: Tracks all contenteditable events
- **Range Visualization**: Visual overlays for selection and input ranges
- **DOM Change Tracking**: Detects and visualizes text node changes
- **Snapshot Management**: Capture and store editor state snapshots
- **Floating Panel**: Interactive UI for viewing events, snapshots, and document structure

### Lexical Plugin Features

- **Update Tracking**: Monitors all editor state updates via `registerUpdateListener`
- **Selection Tracking**: Tracks selection state changes
- **Document Tracking**: Captures document structure
- **Command Tracking**: Tracks command execution via `registerCommandListener`
- **History Tracking**: Monitors undo/redo operations
- **Formatting Tracking**: Detects changes in TextNode format flags

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm

### Installation

```bash
# Install dependencies
pnpm install

# Start the dev server
pnpm --filter lexical-test dev
```

Or from the root:

```bash
pnpm test:lexical
```

The app will be available at `http://localhost:5174` (or the next available port).

## Usage

### Basic Usage

1. **Type in the editor**: Start typing to see events being logged
2. **Open the panel**: Click the floating button (🔍) in the bottom-right corner
3. **View events**: Check the "Events" tab to see all logged events
4. **View snapshots**: Check the "Snapshots" tab to see captured snapshots
5. **View structure**: Check the "Structure" tab to see Lexical document structure

### Buttons

- **Capture Snapshot**: Manually capture a snapshot of the current editor state
- **Clear Events**: Clear all logged events
- **Export Data**: Export all data (events, snapshots, plugin state) as JSON
- **Show Lexical State**: Display plugin state in console and alert

### Plugin Configuration

The Lexical plugin is configured with:

```typescript
const lexicalPlugin = new LexicalPlugin({
  config: {
    trackUpdates: true,      // Track editor updates
    trackSelection: true,     // Track selection changes
    trackDocument: true,      // Track document structure
    trackCommands: true,      // Track command execution
    trackHistory: true,       // Track undo/redo
    trackFormatting: true,    // Track formatting changes
    maxUpdateHistory: 100,    // Maximum stored updates
  },
});
```

## Testing

### Manual Testing

1. Type various text inputs
2. Select text and replace it
3. Use IME composition (for non-English input)
4. Check the floating panel for logged events
5. Capture snapshots at different states
6. Export data and inspect the JSON

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
  "lexical": {
    "state": {...},        // Current Lexical plugin state
    "events": [...]        // All Lexical plugin events
  }
}
```

## Troubleshooting

### Plugin not showing in Structure tab

- Ensure `trackDocument: true` is set in plugin config
- Check browser console for errors
- Verify the plugin is properly registered: `visualizer.registerPlugin(plugin, editor)`

### Events not being logged

- Check that `logEvents: true` is set in visualizer options
- Verify the editor element is properly initialized
- Check browser console for errors

### Snapshot capture fails

- Check browser console for IndexedDB errors
- Ensure browser supports IndexedDB
- Try clearing browser storage

## Learn More

- [ContentEditable Visualizer Documentation](../../packages/contenteditable-visualizer/README.md)
- [Lexical Plugin Documentation](../../packages/contenteditable/lexical/README.md)
- [Lexical Official Docs](https://lexical.dev/)
