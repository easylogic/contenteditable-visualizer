# ContentEditable Test App

This is a basic test application for the ContentEditable Visualizer without any specific editor framework.

## Overview

This app demonstrates the core features of `contenteditable-visualizer` with a plain contenteditable element. It's useful for:

- Testing core visualizer functionality
- Understanding basic event tracking
- Learning how to use the visualizer API
- Debugging contenteditable behavior

## Features

### Core Visualizer Features

- **Event Logging**: Tracks all contenteditable events (beforeinput, input, composition, selection)
- **Range Visualization**: Visual overlays for selection, composition, and input ranges
- **DOM Change Tracking**: Detects and visualizes text node changes
- **Snapshot Management**: Capture and store editor state snapshots
- **Floating Panel**: Interactive UI for viewing events and snapshots
- **Abnormal Detection**: Automatically detects unusual event patterns

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm

### Installation

```bash
# Install dependencies
pnpm install

# Start the dev server
pnpm --filter contenteditable-test dev
```

Or from the root:

```bash
pnpm test:contenteditable
```

The app will be available at `http://localhost:5176` (or the next available port).

## Usage

### Basic Usage

1. **Type in the editor**: Start typing to see events being logged
2. **Open the panel**: Click the floating button (🔍) in the bottom-right corner
3. **View events**: Check the "Events" tab to see all logged events chronologically
4. **View snapshots**: Check the "Snapshots" tab to see captured snapshots
5. **Toggle visualization**: Use the toggle button to show/hide visual overlays

### Buttons

- **Capture Snapshot**: Manually capture a snapshot of the current editor state
- **Clear Events**: Clear all logged events
- **Clear Snapshots**: Clear all stored snapshots
- **Export Data**: Export all data (events, snapshots) as JSON
- **Toggle Visualization**: Show/hide visual overlays

### Visualizer Configuration

The visualizer is configured with:

```typescript
const visualizer = createVisualizer(editorElement, {
  visualize: true,        // Enable visual overlays
  logEvents: true,         // Enable event logging
  snapshots: true,         // Enable snapshot management
  panel: true,             // Show floating panel
  autoSnapshot: false,     // Don't auto-capture snapshots
});
```

## Testing

### Manual Testing

1. **Basic Input**: Type normal text
2. **Selection**: Select text and replace it
3. **IME Composition**: Use IME for non-English input (e.g., Japanese, Chinese)
4. **Special Characters**: Try emojis, unicode characters, invisible characters
5. **Edge Cases**: 
   - Empty paragraphs
   - Whitespace-only content
   - Non-editable elements
   - Boundary inputs (start/end of inline elements)

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
  "environment": {...}     // Browser/environment info
}
```

## Understanding Events

### Event Types

- **beforeinput**: Fired before the browser processes the input
- **input**: Fired after the browser processes the input
- **compositionstart**: IME composition starts
- **compositionupdate**: IME composition updates
- **compositionend**: IME composition ends
- **selectionchange**: Selection changes

### Event Pairs

The visualizer automatically pairs `beforeinput` and `input` events. Look for:
- **InputType Mismatch**: When beforeinput and input have different inputTypes
- **Missing Events**: When one event is missing
- **Range Inconsistencies**: When ranges don't match expectations

## Troubleshooting

### Events not being logged

- Check that `logEvents: true` is set in visualizer options
- Verify the editor element has `contenteditable="true"`
- Check browser console for errors

### Visualization not showing

- Check that `visualize: true` is set in visualizer options
- Ensure the editor element is visible
- Check browser console for errors

### Snapshot capture fails

- Check browser console for IndexedDB errors
- Ensure browser supports IndexedDB
- Try clearing browser storage

## Learn More

- [ContentEditable Visualizer Documentation](../../packages/contenteditable-visualizer/README.md)
- [Event History Analysis](../../packages/contenteditable-visualizer/EVENT_HISTORY_ANALYSIS.md)
