import { describe, it, expect } from 'vitest';
import { ScenarioIdGenerator, type ScenarioCondition } from './scenario-id';

describe('ScenarioIdGenerator', () => {
  describe('generate', () => {
    it('should return "0" for empty conditions', () => {
      expect(ScenarioIdGenerator.generate([])).toBe('0');
    });

    it('should generate ID for single condition', () => {
      expect(ScenarioIdGenerator.generate(['input-type-mismatch'])).toBe('1');
      expect(ScenarioIdGenerator.generate(['parent-mismatch'])).toBe('2');
      expect(ScenarioIdGenerator.generate(['node-mismatch'])).toBe('3');
    });

    it('should generate hierarchical ID for multiple conditions', () => {
      expect(ScenarioIdGenerator.generate(['input-type-mismatch', 'parent-mismatch'])).toBe('1.2');
      expect(ScenarioIdGenerator.generate(['parent-mismatch', 'node-mismatch', 'selection-mismatch'])).toBe('2.3.4');
    });

    it('should sort conditions by base ID', () => {
      // Even if passed in different order, should be sorted
      expect(ScenarioIdGenerator.generate(['node-mismatch', 'input-type-mismatch', 'parent-mismatch'])).toBe('1.2.3');
    });

    it('should handle all condition types', () => {
      const allConditions: ScenarioCondition[] = [
        'input-type-mismatch',
        'parent-mismatch',
        'node-mismatch',
        'selection-mismatch',
        'missing-beforeinput',
        'missing-input',
        'boundary-input',
        'full-selection',
        'range-inconsistency',
        'range-dom-mismatch',
        'unexpected-sequence',
      ];
      const id = ScenarioIdGenerator.generate(allConditions);
      expect(id).toBe('1.2.3.4.5.6.7.8.9.10.11');
    });
  });

  describe('parse', () => {
    it('should parse "0" to empty array', () => {
      expect(ScenarioIdGenerator.parse('0')).toEqual([]);
    });

    it('should parse single ID to condition array', () => {
      expect(ScenarioIdGenerator.parse('1')).toEqual(['input-type-mismatch']);
      expect(ScenarioIdGenerator.parse('2')).toEqual(['parent-mismatch']);
    });

    it('should parse hierarchical ID to condition array', () => {
      expect(ScenarioIdGenerator.parse('1.2')).toEqual(['input-type-mismatch', 'parent-mismatch']);
      expect(ScenarioIdGenerator.parse('1.2.3')).toEqual(['input-type-mismatch', 'parent-mismatch', 'node-mismatch']);
    });

    it('should handle all IDs', () => {
      const parsed = ScenarioIdGenerator.parse('1.2.3.4.5.6.7.8.9.10.11');
      expect(parsed.length).toBe(11);
      expect(parsed).toContain('input-type-mismatch');
      expect(parsed).toContain('unexpected-sequence');
    });
  });

  describe('getDescription', () => {
    it('should return description for "0"', () => {
      expect(ScenarioIdGenerator.getDescription('0')).toBe('정상 입력');
    });

    it('should return description for single condition', () => {
      expect(ScenarioIdGenerator.getDescription('1')).toBe('InputType 불일치');
      expect(ScenarioIdGenerator.getDescription('2')).toBe('Parent Mismatch');
    });

    it('should return combined description for multiple conditions', () => {
      const desc = ScenarioIdGenerator.getDescription('1.2');
      expect(desc).toContain('InputType 불일치');
      expect(desc).toContain('Parent Mismatch');
    });

    it('should handle all condition descriptions', () => {
      const desc = ScenarioIdGenerator.getDescription('1.2.3.4.5.6.7.8.9.10.11');
      expect(desc).toBeTruthy();
      expect(desc).toContain('InputType 불일치');
      expect(desc).toContain('예상치 못한 시퀀스');
    });
  });

  describe('round-trip', () => {
    it('should generate and parse correctly', () => {
      const conditions: ScenarioCondition[] = ['input-type-mismatch', 'parent-mismatch', 'node-mismatch'];
      const id = ScenarioIdGenerator.generate(conditions);
      const parsed = ScenarioIdGenerator.parse(id);
      
      // Should contain all original conditions (order may differ due to sorting)
      expect(parsed.length).toBe(conditions.length);
      conditions.forEach(condition => {
        expect(parsed).toContain(condition);
      });
    });
  });
});
