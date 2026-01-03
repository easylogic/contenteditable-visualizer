import { describe, it, expect } from 'vitest';
import { extractEventPairs, type EventPair } from './event-pair';
import type { EventLog } from './event-logger';

describe('extractEventPairs', () => {
  it('should extract beforeinput-input pairs', () => {
    const logs: EventLog[] = [
      {
        id: 1,
        timestamp: 1000,
        type: 'beforeinput',
        inputType: 'insertText',
        data: 'a',
        parent: null,
        node: null,
        startOffset: 0,
        endOffset: 0,
      },
      {
        id: 2,
        timestamp: 1001,
        type: 'input',
        inputType: 'insertText',
        data: 'a',
        parent: null,
        node: null,
        startOffset: 0,
        endOffset: 1,
      },
    ] as EventLog[];

    const pairs = extractEventPairs(logs);
    expect(pairs.length).toBe(1);
    expect(pairs[0].beforeInput?.id).toBe(1);
    expect(pairs[0].input?.id).toBe(2);
  });

  it('should handle missing beforeinput', () => {
    const logs: EventLog[] = [
      {
        id: 1,
        timestamp: 1000,
        type: 'input',
        inputType: 'insertText',
        data: 'a',
        parent: null,
        node: null,
        startOffset: 0,
        endOffset: 1,
      },
    ] as EventLog[];

    const pairs = extractEventPairs(logs);
    expect(pairs.length).toBe(1);
    expect(pairs[0].beforeInput).toBeNull();
    expect(pairs[0].input?.id).toBe(1);
  });

  it('should handle multiple pairs', () => {
    const logs: EventLog[] = [
      {
        id: 1,
        timestamp: 1000,
        type: 'beforeinput',
        inputType: 'insertText',
        data: 'a',
        parent: null,
        node: null,
        startOffset: 0,
        endOffset: 0,
      },
      {
        id: 2,
        timestamp: 1001,
        type: 'input',
        inputType: 'insertText',
        data: 'a',
        parent: null,
        node: null,
        startOffset: 0,
        endOffset: 1,
      },
      {
        id: 3,
        timestamp: 2000,
        type: 'beforeinput',
        inputType: 'insertText',
        data: 'b',
        parent: null,
        node: null,
        startOffset: 1,
        endOffset: 1,
      },
      {
        id: 4,
        timestamp: 2001,
        type: 'input',
        inputType: 'insertText',
        data: 'b',
        parent: null,
        node: null,
        startOffset: 1,
        endOffset: 2,
      },
    ] as EventLog[];

    const pairs = extractEventPairs(logs);
    expect(pairs.length).toBe(2);
    expect(pairs[0].beforeInput?.id).toBe(1);
    expect(pairs[0].input?.id).toBe(2);
    expect(pairs[1].beforeInput?.id).toBe(3);
    expect(pairs[1].input?.id).toBe(4);
  });
});
