---
"@contenteditable/prosemirror": patch
---

Add comprehensive vitest test suite for ProseMirror plugin

- Add 30 test cases covering all plugin features
- Improve EditorView validation logic
- Fix dispatch method wrapping for transaction tracking
- Add indexedDB mocking for jsdom test environment
- Test edge cases including empty documents, rapid transactions, and detach/reattach scenarios
