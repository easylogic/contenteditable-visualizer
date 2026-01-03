import { describe, it, expect } from 'vitest';
import { getElementId } from './element-id';

describe('getElementId', () => {
  it('should generate tracking id for element', () => {
    const element = document.createElement('div');
    const id = getElementId(element);
    expect(id).toBeTruthy();
    expect(id).toMatch(/^cev-/);
  });

  it('should generate id even if element has DOM id', () => {
    const element = document.createElement('div');
    element.id = 'test-id';
    // getElementId creates tracking ID, not using DOM id
    const trackingId = getElementId(element);
    expect(trackingId).toMatch(/^cev-/);
    expect(trackingId).not.toBe('test-id');
  });

  it('should return same id for same element', () => {
    const element = document.createElement('div');
    const id1 = getElementId(element);
    const id2 = getElementId(element);
    expect(id1).toBe(id2);
  });

  it('should return different ids for different elements', () => {
    const element1 = document.createElement('div');
    const element2 = document.createElement('div');
    const id1 = getElementId(element1);
    const id2 = getElementId(element2);
    expect(id1).not.toBe(id2);
  });
});
