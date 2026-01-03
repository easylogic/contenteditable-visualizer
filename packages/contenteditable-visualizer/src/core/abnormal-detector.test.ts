import { describe, it, expect } from 'vitest';
import { AbnormalDetector, type PreviousSelection } from './abnormal-detector';
import type { EventPair } from './event-pair';
import type { EventLog } from './event-logger';

describe('AbnormalDetector', () => {
  let detector: AbnormalDetector;

  beforeEach(() => {
    detector = new AbnormalDetector();
  });

  describe('inputType mismatch', () => {
    it('should detect inputType mismatch', () => {
      const eventPair: EventPair = {
        beforeInput: {
          id: 1,
          timestamp: 1000,
          type: 'beforeinput',
          inputType: 'insertText',
          data: 'a',
          parent: null,
          node: null,
          startOffset: 0,
          endOffset: 0,
        } as EventLog,
        input: {
          id: 2,
          timestamp: 1001,
          type: 'input',
          inputType: 'insertCompositionText',
          data: 'a',
          parent: null,
          node: null,
          startOffset: 0,
          endOffset: 1,
        } as EventLog,
        eventKey: 'test',
        inputTypeMismatch: true,
        timestampDelta: 1,
      };

      const result = detector.detectAbnormal(eventPair);
      expect(result.isAbnormal).toBe(true);
      expect(result.trigger).toBe('input-type-mismatch');
      expect(result.detail).toContain('input-type-mismatch');
    });

    it('should not detect abnormality when inputTypes match', () => {
      const eventPair: EventPair = {
        beforeInput: {
          id: 1,
          timestamp: 1000,
          type: 'beforeinput',
          inputType: 'insertText',
          data: 'a',
          parent: null,
          node: null,
          startOffset: 0,
          endOffset: 0,
        } as EventLog,
        input: {
          id: 2,
          timestamp: 1001,
          type: 'input',
          inputType: 'insertText',
          data: 'a',
          parent: null,
          node: null,
          startOffset: 0,
          endOffset: 1,
        } as EventLog,
        eventKey: 'test',
        inputTypeMismatch: false,
        timestampDelta: 1,
      };

      const result = detector.detectAbnormal(eventPair);
      expect(result.isAbnormal).toBe(false);
    });
  });

  describe('parent mismatch', () => {
    it('should detect parent mismatch', () => {
      const eventPair: EventPair = {
        beforeInput: {
          id: 1,
          timestamp: 1000,
          type: 'beforeinput',
          inputType: 'insertText',
          data: 'a',
          parent: { nodeName: 'DIV', id: 'parent1' },
          node: null,
          startOffset: 0,
          endOffset: 0,
        } as EventLog,
        input: {
          id: 2,
          timestamp: 1001,
          type: 'input',
          inputType: 'insertText',
          data: 'a',
          parent: { nodeName: 'DIV', id: 'parent2' },
          node: null,
          startOffset: 0,
          endOffset: 1,
        } as EventLog,
        eventKey: 'test',
        inputTypeMismatch: false,
        timestampDelta: 1,
      };

      const result = detector.detectAbnormal(eventPair);
      expect(result.isAbnormal).toBe(true);
      expect(result.detail).toContain('parent-mismatch');
    });
  });

  describe('node mismatch', () => {
    it('should detect node mismatch', () => {
      const eventPair: EventPair = {
        beforeInput: {
          id: 1,
          timestamp: 1000,
          type: 'beforeinput',
          inputType: 'insertText',
          data: 'a',
          parent: null,
          node: { nodeName: '#text' },
          startOffset: 0,
          endOffset: 0,
        } as EventLog,
        input: {
          id: 2,
          timestamp: 1001,
          type: 'input',
          inputType: 'insertText',
          data: 'a',
          parent: null,
          node: { nodeName: 'SPAN' },
          startOffset: 0,
          endOffset: 1,
        } as EventLog,
        eventKey: 'test',
        inputTypeMismatch: false,
        timestampDelta: 1,
      };

      const result = detector.detectAbnormal(eventPair);
      expect(result.isAbnormal).toBe(true);
      expect(result.detail).toContain('node-mismatch');
    });
  });

  describe('missing events', () => {
    it('should detect missing beforeinput', () => {
      const eventPair: EventPair = {
        beforeInput: null,
        input: {
          id: 2,
          timestamp: 1001,
          type: 'input',
          inputType: 'insertText',
          data: 'a',
          parent: null,
          node: null,
          startOffset: 0,
          endOffset: 1,
        } as EventLog,
        eventKey: 'test',
        inputTypeMismatch: false,
        timestampDelta: -1,
      };

      const result = detector.detectAbnormal(eventPair);
      expect(result.isAbnormal).toBe(true);
      expect(result.detail).toContain('missing-beforeinput');
    });

    it('should detect missing input', () => {
      const eventPair: EventPair = {
        beforeInput: {
          id: 1,
          timestamp: 1000,
          type: 'beforeinput',
          inputType: 'insertText',
          data: 'a',
          parent: null,
          node: null,
          startOffset: 0,
          endOffset: 0,
        } as EventLog,
        input: null,
        eventKey: 'test',
        inputTypeMismatch: false,
        timestampDelta: -1,
      };

      const result = detector.detectAbnormal(eventPair);
      expect(result.isAbnormal).toBe(true);
      expect(result.detail).toContain('missing-input');
    });
  });

  describe('boundary input', () => {
    it('should detect boundary input at start', () => {
      const eventPair: EventPair = {
        beforeInput: {
          id: 1,
          timestamp: 1000,
          type: 'beforeinput',
          inputType: 'insertText',
          data: 'a',
          parent: { nodeName: 'span' },
          node: { nodeName: '#text' },
          startOffset: 0,
          endOffset: 0,
          startContainerText: 'hello',
        } as EventLog,
        input: null,
        eventKey: 'test',
        inputTypeMismatch: false,
        timestampDelta: -1,
      };

      const result = detector.detectAbnormal(eventPair);
      expect(result.isAbnormal).toBe(true);
      expect(result.detail).toContain('boundary-input');
    });

    it('should detect boundary input at end', () => {
      const eventPair: EventPair = {
        beforeInput: {
          id: 1,
          timestamp: 1000,
          type: 'beforeinput',
          inputType: 'insertText',
          data: 'a',
          parent: { nodeName: 'span' },
          node: { nodeName: '#text' },
          startOffset: 5,
          endOffset: 5,
          startContainerText: 'hello',
        } as EventLog,
        input: null,
        eventKey: 'test',
        inputTypeMismatch: false,
        timestampDelta: -1,
      };

      const result = detector.detectAbnormal(eventPair);
      expect(result.isAbnormal).toBe(true);
      expect(result.detail).toContain('boundary-input');
    });
  });

  describe('selection mismatch', () => {
    it('should detect selection jump', () => {
      const eventPair: EventPair = {
        beforeInput: {
          id: 1,
          timestamp: 1000,
          type: 'beforeinput',
          inputType: 'insertText',
          data: 'a',
          parent: null,
          node: null,
          startOffset: 0,
          endOffset: 0,
        } as EventLog,
        input: {
          id: 2,
          timestamp: 1001,
          type: 'input',
          inputType: 'insertText',
          data: 'a',
          parent: { nodeName: 'DIV', id: 'same-parent' },
          node: null,
          startOffset: 20, // Large jump
          endOffset: 21,
        } as EventLog,
        eventKey: 'test',
        inputTypeMismatch: false,
        timestampDelta: 1,
      };

      const lastInputSelection: PreviousSelection = {
        parentId: 'same-parent',
        offset: 0,
        endOffset: 0,
        timestamp: 999,
      };

      const result = detector.detectAbnormal(eventPair, {
        lastInputSelection,
      });
      expect(result.isAbnormal).toBe(true);
      expect(result.detail).toContain('selection-mismatch');
    });
  });

  describe('range inconsistency', () => {
    it('should detect range inconsistency', () => {
      const mockRange1 = {
        collapsed: false,
        startOffset: 0,
        endOffset: 0,
        startContainer: document.createTextNode('test'),
        endContainer: document.createTextNode('test'),
      } as Range;

      const mockRange2 = {
        collapsed: false,
        startOffset: 20, // Should be around 1 (0 + data length)
        endOffset: 21,
        startContainer: document.createTextNode('atest'),
        endContainer: document.createTextNode('atest'),
      } as Range;

      const eventPair: EventPair = {
        beforeInput: {
          id: 1,
          timestamp: 1000,
          type: 'beforeinput',
          inputType: 'insertText',
          data: 'a',
          parent: null,
          node: null,
          startOffset: 0,
          endOffset: 0,
          range: mockRange1,
        } as EventLog,
        input: {
          id: 2,
          timestamp: 1001,
          type: 'input',
          inputType: 'insertText',
          data: 'a',
          parent: null,
          node: null,
          startOffset: 20,
          endOffset: 21,
          range: mockRange2,
        } as EventLog,
        eventKey: 'test',
        inputTypeMismatch: false,
        timestampDelta: 1,
      };

      const result = detector.detectAbnormal(eventPair);
      expect(result.isAbnormal).toBe(true);
      expect(result.detail).toContain('range-inconsistency');
    });
  });

  describe('scenario ID generation', () => {
    it('should generate scenario ID for multiple conditions', () => {
      const eventPair: EventPair = {
        beforeInput: {
          id: 1,
          timestamp: 1000,
          type: 'beforeinput',
          inputType: 'insertText',
          data: 'a',
          parent: { nodeName: 'DIV', id: 'parent1' },
          node: { nodeName: '#text' },
          startOffset: 0,
          endOffset: 0,
        } as EventLog,
        input: {
          id: 2,
          timestamp: 1001,
          type: 'input',
          inputType: 'insertCompositionText',
          data: 'a',
          parent: { nodeName: 'DIV', id: 'parent2' },
          node: { nodeName: 'SPAN' },
          startOffset: 0,
          endOffset: 1,
        } as EventLog,
        eventKey: 'test',
        inputTypeMismatch: true,
        timestampDelta: 1,
      };

      const result = detector.detectAbnormal(eventPair);
      expect(result.isAbnormal).toBe(true);
      expect(result.scenarioId).toBeTruthy();
      expect(result.scenarioDescription).toBeTruthy();
    });
  });
});
