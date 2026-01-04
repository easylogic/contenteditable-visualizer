---
"contenteditable-visualizer": minor
---

## Event Pair History View Enhancement

### Added Features

- **Event Pair History Viewer** (`EventPairHistoryViewer`)
  - Display last N event pairs (default: 10)
  - Scrollable history container
  - Abnormal detection badges per pair
  - InputType mismatch badges
  - Timestamp information display

- **Editor Event Integration**
  - Collect and display plugin events within 100ms before `beforeinput`
  - Collect and display plugin events within 100ms after `input`
  - Group events by plugin
  - Option to show/hide editor events (`showEditorEvents`)

- **Abnormal Detection Badges**
  - Warning badges for abnormal event pairs
  - Scenario ID and description display
  - InputType mismatch badges

### Changes

- Integrated event pair history view into `FloatingPanel`'s Events tab
- Added `EventPairHistoryViewer` class
- Added editor event collection logic (`collectEditorEventsBefore`, `collectEditorEventsAfter`)
