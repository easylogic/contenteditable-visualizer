# Slate.js Test App

This is a test application for the ContentEditable Visualizer with Slate.js integration.

## Overview

This app demonstrates how to use the `contenteditable-visualizer` with Slate.js editor. It includes:

- Slate.js editor setup (with React)
- Slate plugin integration
- Event tracking and visualization
- Snapshot capture and export

## Features

### Editor Features

- Rich text editing with Slate.js
- React-based editor component
- Operation tracking

### Visualizer Features

- **Event Logging**: Tracks all contenteditable events
- **Range Visualization**: Visual overlays for selection and input ranges
- **DOM Change Tracking**: Detects and visualizes text node changes
- **Snapshot Management**: Capture and store editor state snapshots
- **Floating Panel**: Interactive UI for viewing events, snapshots, and document structure

### Slate Plugin Features

- **Operation Tracking**: Monitors all Slate operations via `onChange`
- **Selection Tracking**: Tracks selection state changes
- **Document Tracking**: Captures document structure
- **Operation History**: Stores recent operations for analysis

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm

### Installation

```bash
# Install dependencies
pnpm install

# Start the dev server
pnpm --filter slatejs-test dev
```

Or from the root:

```bash
pnpm test:slatejs
```

The app will be available at `http://localhost:5175` (or the next available port).

## Usage

### Basic Usage

1. **Type in the editor**: Start typing to see events being logged
2. **Open the panel**: Click the floating button (🔍) in the bottom-right corner
3. **View events**: Check the "Events" tab to see all logged events
4. **View snapshots**: Check the "Snapshots" tab to see captured snapshots
5. **View structure**: Check the "Structure" tab to see Slate document structure

### Buttons

- **Capture Snapshot**: Manually capture a snapshot of the current editor state
- **Clear Events**: Clear all logged events
- **Export Data**: Export all data (events, snapshots, plugin state) as JSON

### Plugin Configuration

The Slate plugin is configured with:

```typescript
const plugin = new SlatePlugin({
  config: {
    trackOperations: true,     // Track Slate operations
    trackSelection: true,       // Track selection changes
    trackDocument: true,        // Track document structure
    maxOperationHistory: 100,    // Maximum stored operations
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
  "slate": {
    "state": {...},        // Current Slate plugin state
    "events": [...]        // All Slate plugin events
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

## Note

This app includes both a React-based implementation (commented out) and a simplified version using plain contenteditable. For full Slate.js integration, uncomment the React code and ensure React dependencies are installed.

## Learn More

- [ContentEditable Visualizer Documentation](../../packages/contenteditable-visualizer/README.md)
- [Slate Plugin Documentation](../../packages/contenteditable/slate/README.md)
- [Slate.js Official Docs](https://www.slatejs.org/)
