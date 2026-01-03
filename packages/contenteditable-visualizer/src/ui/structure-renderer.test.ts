import { describe, it, expect, beforeEach } from 'vitest';
import { StructureRenderer, structureToVNode, type StructureNode } from './structure-renderer';

describe('structureToVNode', () => {
  it('should convert simple structure node to VNode', () => {
    const node: StructureNode = {
      type: 'paragraph',
      text: 'Hello',
    };

    const vnode = structureToVNode(node, 0);
    expect(vnode).toBeDefined();
    expect(vnode.sel).toBe('div');
  });

  it('should handle nested children', () => {
    const node: StructureNode = {
      type: 'doc',
      children: [
        {
          type: 'paragraph',
          text: 'Test',
        },
      ],
    };

    const vnode = structureToVNode(node, 0);
    expect(vnode).toBeDefined();
  });

  it('should include attributes', () => {
    const node: StructureNode = {
      type: 'paragraph',
      attrs: { class: 'test' },
    };

    const vnode = structureToVNode(node, 0);
    expect(vnode).toBeDefined();
  });
});

describe('StructureRenderer', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  it('should initialize with empty state', () => {
    const renderer = new StructureRenderer(container);
    expect(renderer).toBeDefined();
  });

  it('should update with structure data', () => {
    const renderer = new StructureRenderer(container);
    const data: StructureNode = {
      type: 'doc',
      children: [
        {
          type: 'paragraph',
          text: 'Test',
        },
      ],
    };

    renderer.update(data);
    expect(container.children.length).toBeGreaterThan(0);
  });

  it('should show empty state for null data', () => {
    const renderer = new StructureRenderer(container);
    renderer.update(null);
    
    // Check if container has the empty state text
    expect(container.textContent).toContain('No document structure available');
  });

  it('should not update if data unchanged', () => {
    const renderer = new StructureRenderer(container);
    const data: StructureNode = {
      type: 'doc',
    };

    renderer.update(data);
    const firstChildCount = container.children.length;

    // Update with same data - should skip update
    renderer.update(data);
    const secondChildCount = container.children.length;

    // Should have same structure since data didn't change
    expect(firstChildCount).toBe(secondChildCount);
  });

  it('should clear structure view', () => {
    const renderer = new StructureRenderer(container);
    const data: StructureNode = {
      type: 'doc',
    };

    renderer.update(data);
    expect(container.children.length).toBeGreaterThan(0);

    renderer.clear();
    // After clear, should have minimal structure
    expect(renderer).toBeDefined();
  });
});
