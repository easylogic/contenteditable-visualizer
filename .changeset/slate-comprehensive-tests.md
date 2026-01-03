---
"@contenteditable/slate": patch
---

Add comprehensive test suite for Slate plugin

- Add 15 additional test cases covering all operation types
- Test selection tracking with set_selection operations and null selection
- Test document tracking and state management
- Add edge case tests for onChange without operation, undefined operation, and multiple operations
- Verify event data structure and relatedEventId linking
- Total test coverage: 36 test cases, all passing
