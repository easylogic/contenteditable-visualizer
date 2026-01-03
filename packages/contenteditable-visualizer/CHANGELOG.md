# contenteditable-visualizer

## 0.1.6

### Patch Changes

- 74aa1b8: Add comprehensive Vitest test suite for contenteditable-visualizer

  - Add vitest, @vitest/ui, and jsdom as dev dependencies
  - Add vitest.config.ts with jsdom environment configuration
  - Add test-setup.ts with IndexedDB mocking for test environment
  - Add test files:
    - utils/throttle.test.ts - throttle and debounce utility tests (6 tests)
    - utils/element-id.test.ts - element ID management tests (4 tests)
    - core/event-pair.test.ts - event pair extraction tests (3 tests)
    - core/scenario-id.test.ts - scenario ID generation and parsing tests (14 tests)
    - core/abnormal-detector.test.ts - abnormal detection logic tests (11 tests)
    - core/snapshot-manager.test.ts - snapshot storage and retrieval tests (10 tests)
    - plugins/base.test.ts - base plugin class tests (18 tests)
    - ui/structure-renderer.test.ts - structure renderer tests (8 tests)
  - Fix missing detectUnexpectedSequence method in AbnormalDetector class
  - Total: 74 tests, all passing

## 0.1.5

### Patch Changes

- bae0f2d: support event fair log

## 0.1.4

### Patch Changes

- 13efc22: support plugin for prosemirror, slate

## 0.1.3

### Patch Changes

- 8c413ce: Support plugin system

## 0.1.2

### Patch Changes

- 654e356: update README.md

## 0.1.1

### Patch Changes

- bda2a59: initialize project
