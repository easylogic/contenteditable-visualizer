# ContentEditable Visualizer Monorepo

A comprehensive SDK for visualizing and tracking contenteditable events, ranges, and DOM changes. Works with any editor (ProseMirror, Slate.js, Editor.js, Lexical, etc.) without React dependencies.

## 🎯 Overview

This monorepo contains:
- **SDK Package** (`packages/contenteditable-visualizer`) - The main library
- **Test Applications** (`apps/*`) - Test apps for various editors

The SDK provides:
- Real-time range visualization (selection, composition, input events)
- DOM change tracking (text node additions, deletions, modifications)
- Event logging with detailed information
- Snapshot management with IndexedDB storage
- Floating UI panel for event and snapshot viewing
- Framework-agnostic design (pure TypeScript/DOM API)

## 📁 Monorepo Structure

```
.
├── packages/
│   └── contenteditable-visualizer/  # SDK package
│       ├── src/                     # Source code
│       │   ├── core/                # Core functionality
│       │   ├── ui/                  # UI components
│       │   └── utils/               # Utilities
│       ├── dist/                    # Built output
│       └── package.json
└── apps/
    ├── contenteditable-test/        # Basic contenteditable test
    ├── prosemirror-test/            # ProseMirror integration test
    ├── slatejs-test/                # Slate.js integration test
    ├── editorjs-test/               # Editor.js integration test
    └── lexical-test/                # Lexical integration test
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- pnpm 8+ (recommended) or npm/yarn

### Installation

```bash
# Install all dependencies
pnpm install
```

### Development

#### Build SDK

```bash
# Build SDK package
pnpm build

# Watch mode (rebuilds on changes)
pnpm dev
```

#### Run Test Apps

```bash
# ContentEditable test (basic)
pnpm test:contenteditable

# ProseMirror test
pnpm test:prosemirror

# Slate.js test
pnpm test:slatejs

# Editor.js test
pnpm test:editorjs

# Lexical test
pnpm test:lexical

# Run all test apps in parallel
pnpm dev
```

Each test app runs on a different port:
- ContentEditable: `http://localhost:3000`
- ProseMirror: `http://localhost:3001`
- Slate.js: `http://localhost:3002`
- Editor.js: `http://localhost:3003`
- Lexical: `http://localhost:3004`

## 📦 Package Configuration

### Development vs. Production

The SDK package uses a dual configuration:

- **Development** (workspace dependencies): Uses `src/index.ts` directly
  - Allows test apps to use source code without building
  - Enables hot reloading and faster iteration
  - Configured in `package.json` main `exports`

- **Production** (published package): Uses `dist/index.js`
  - Configured in `publishConfig` section
  - Built with Vite for optimal bundle size
  - Includes TypeScript declarations

### Workspace Dependencies

Test apps reference the SDK as a workspace dependency:

```json
{
  "dependencies": {
    "contenteditable-visualizer": "workspace:*"
  }
}
```

This allows direct import from source during development:

```typescript
import { createVisualizer } from 'contenteditable-visualizer';
// Imports from packages/contenteditable-visualizer/src/index.ts
```

## 🛠️ Development Workflow

### 1. Make Changes to SDK

```bash
# Edit files in packages/contenteditable-visualizer/src/
# Changes are automatically picked up by test apps (if using watch mode)
```

### 2. Test Your Changes

```bash
# Run a specific test app
pnpm test:prosemirror

# Or run all test apps
pnpm dev
```

### 3. Build for Production

```bash
# Build SDK
cd packages/contenteditable-visualizer
pnpm build

# Output will be in dist/
```

### 4. Test Production Build

Test apps can be configured to use the built version by temporarily updating their imports, or by publishing locally:

```bash
# Publish locally (if needed)
pnpm publish --dry-run
```

## 📚 SDK Features

### Core Features

- **Range Visualization** - Visualize selection, composition, beforeinput, and input ranges with SVG overlays
- **DOM Change Tracking** - Track text node changes (added, deleted, modified, moved) in real-time
- **Event Logging** - Capture all contenteditable events with detailed information
- **Snapshot Management** - Capture and store snapshots with IndexedDB
- **Floating UI Panel** - Built-in event viewer and snapshot history viewer
- **Framework Agnostic** - Pure TypeScript/DOM API, no React required

### Advanced Features

- Customizable color schemes
- Configurable performance options (throttling, log limits)
- Error handling callbacks
- Custom overlay containers
- Auto-snapshot on input events
- Export functionality for debugging

## 📖 Usage Example

```typescript
import { createVisualizer } from 'contenteditable-visualizer';

const editorElement = document.querySelector('[contenteditable]');
const visualizer = createVisualizer(editorElement, {
  visualize: true,
  logEvents: true,
  snapshots: true,
  panel: true,
  colors: {
    selection: {
      fill: 'rgba(59, 130, 246, 0.2)',
      stroke: 'rgba(59, 130, 246, 0.8)',
    },
  },
});

// Capture snapshot
await visualizer.captureSnapshot('manual', 'User action');

// Get events
const events = visualizer.getEventLogs();

// Export data
const data = await visualizer.exportData();
```

For detailed API documentation, see [packages/contenteditable-visualizer/README.md](./packages/contenteditable-visualizer/README.md).

## 🧪 Test Applications

### ContentEditable Test

Basic test with a simple contenteditable div. Good for testing core functionality.

**Features:**
- Basic text editing
- Snapshot capture
- Event logging
- Data export

### ProseMirror Test

Integration test with ProseMirror editor.

**Features:**
- ProseMirror editor setup
- Visualizer attached to ProseMirror's DOM
- Tests compatibility with ProseMirror's event handling

### Slate.js Test

Integration test with Slate.js editor.

**Features:**
- Slate.js editor setup
- Visualizer attached to Slate's contenteditable element
- Tests compatibility with Slate's event handling

### Editor.js Test

Integration test with Editor.js.

**Features:**
- Editor.js initialization
- Visualizer attached after editor is ready
- Tests compatibility with Editor.js's DOM structure

### Lexical Test

Integration test with Lexical editor.

**Features:**
- Lexical editor setup
- Visualizer attached to Lexical's contenteditable element
- Tests compatibility with Lexical's event handling

## 🔧 Scripts

### Root Scripts

- `pnpm build` - Build all packages
- `pnpm dev` - Run all packages in watch mode
- `pnpm test:contenteditable` - Run contenteditable test app
- `pnpm test:prosemirror` - Run ProseMirror test app
- `pnpm test:slatejs` - Run Slate.js test app
- `pnpm test:editorjs` - Run Editor.js test app
- `pnpm test:lexical` - Run Lexical test app

### SDK Package Scripts

- `pnpm build` - Build SDK with Vite
- `pnpm dev` - Build SDK in watch mode

## 🏗️ Architecture

### Core Components

- **RangeVisualizer** - Handles SVG overlay rendering for ranges
- **EventLogger** - Captures and stores events
- **SnapshotManager** - Manages snapshot creation and IndexedDB storage
- **TextNodeTracker** - Tracks text node changes
- **DomChangeTracker** - Detects DOM modifications
- **FloatingPanel** - UI component for event/snapshot viewing

### Design Principles

- **Framework Agnostic** - No React or other framework dependencies
- **Performance First** - Throttling, efficient DOM tracking, configurable limits
- **Error Resilient** - Comprehensive error handling with callbacks
- **Type Safe** - Full TypeScript support with detailed type definitions
- **Extensible** - Customizable colors, sizes, containers, and callbacks

## 📝 Contributing

1. Make changes in `packages/contenteditable-visualizer/src/`
2. Test with relevant test apps
3. Build SDK: `pnpm build`
4. Update documentation if needed

## 📄 License

MIT

## 🔗 Links

- [SDK Documentation](./packages/contenteditable-visualizer/README.md)
- [Package.json](./packages/contenteditable-visualizer/package.json)
