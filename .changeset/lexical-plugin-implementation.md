---
"@contenteditable/lexical": minor
---

Add Lexical plugin for contenteditable-visualizer

- Implement LexicalPlugin with update listener tracking
- Add selection, document, command, and history state tracking
- Support registerCommandListener for custom command tracking
- Add comprehensive test suite with 23 test cases
- Include full README with usage examples and API documentation
- Fix TypeScript errors for selection anchor/focus properties
- Ensure getEvents() returns PluginEvent[] for consistency with BasePlugin
