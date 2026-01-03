/**
 * Structure Renderer - Efficiently renders document structure using Virtual DOM
 * 
 * Flow: Document -> JSON -> VNode -> Diff -> HTML Update
 */

import { init, h, VNode } from 'snabbdom';
import { classModule } from 'snabbdom/build/modules/class';
import { propsModule } from 'snabbdom/build/modules/props';
import { styleModule } from 'snabbdom/build/modules/style';
import { attributesModule } from 'snabbdom/build/modules/attributes';

// Initialize snabbdom with modules
const patch = init([
  classModule,
  propsModule,
  styleModule,
  attributesModule,
]);

/**
 * Structure node data from plugins
 */
export interface StructureNode {
  type: string;
  key?: string;
  text?: string;
  attrs?: Record<string, any>;
  children?: StructureNode[];
  [key: string]: any; // Allow additional properties
}

/**
 * Convert structure JSON to VNode
 */
export function structureToVNode(data: StructureNode, depth: number = 0): VNode {
  const isRoot = depth === 0;
  
  // Create node item
  const item = h('div', {
    style: {
      marginLeft: `${depth * 16}px`,
      marginTop: '4px',
      padding: '4px 8px',
      backgroundColor: isRoot ? '#111827' : '#1f2937',
      borderRadius: '4px',
      borderLeft: `2px solid ${isRoot ? '#34d399' : '#6b7280'}`,
    },
  }, [
    // Header with type and metadata
    h('div', {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      },
    }, [
      h('span', {
        style: {
          color: '#34d399',
          fontWeight: '600',
        },
      }, data.type),
      
      // Add key if present
      data.key ? h('span', {
        style: {
          color: '#9ca3af',
          fontSize: '11px',
        },
      }, `[key: ${data.key}]`) : null,
      
      // Add attributes if present
      data.attrs && Object.keys(data.attrs).length > 0
        ? h('span', {
            style: {
              color: '#60a5fa',
              fontSize: '11px',
              marginLeft: '8px',
            },
          }, JSON.stringify(data.attrs))
        : null,
    ]),
    
    // Text content if present
    data.text
      ? h('div', {
          style: {
            marginTop: '4px',
            marginLeft: '16px',
            color: '#e5e7eb',
            fontStyle: 'italic',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
          },
        }, data.text.length > 100 ? `${data.text.substring(0, 100)}...` : `"${data.text}"`)
      : null,
    
    // Recursively render children
    data.children && data.children.length > 0
      ? h('div', {}, data.children.map(child => structureToVNode(child, depth + 1)))
      : null,
  ].filter(Boolean) as VNode[]);

  return item;
}

/**
 * Structure renderer class
 * Manages VNode lifecycle and DOM updates
 */
export class StructureRenderer {
  private container: HTMLElement;
  private currentVNode: VNode | null = null;
  private previousData: any = null;

  constructor(container: HTMLElement) {
    this.container = container;
    // Create initial empty VNode
    this.currentVNode = h('div', {});
    patch(this.container, this.currentVNode);
  }

  /**
   * Update structure view with new data
   * Only updates if data has changed
   */
  update(data: StructureNode | StructureNode[] | null): void {
    if (!data) {
      // Show empty state
      const emptyVNode = h('div', {
        class: { 'cev-empty-state': true },
      }, 'No document structure available.');
      
      if (this.currentVNode) {
        patch(this.currentVNode, emptyVNode);
      } else {
        patch(this.container, emptyVNode);
      }
      this.currentVNode = emptyVNode;
      this.previousData = null;
      return;
    }

    // Check if data changed (simple JSON comparison)
    const dataStr = JSON.stringify(data);
    if (this.previousData === dataStr) {
      return; // No change, skip update
    }
    this.previousData = dataStr;

    // Convert to VNode
    const nodes = Array.isArray(data) ? data : [data];
    const newVNode = h('div', {
      style: {
        padding: '12px',
        fontFamily: "'Monaco', 'Menlo', 'Ubuntu Mono', monospace",
        fontSize: '12px',
        color: '#f9fafb',
        overflowX: 'auto',
      },
    }, nodes.map(node => structureToVNode(node)));

    // Patch DOM (snabbdom handles diff and update)
    if (this.currentVNode) {
      patch(this.currentVNode, newVNode);
    } else {
      patch(this.container, newVNode);
    }
    this.currentVNode = newVNode;
  }

  /**
   * Clear structure view
   */
  clear(): void {
    const emptyVNode = h('div', {});
    if (this.currentVNode) {
      patch(this.currentVNode, emptyVNode);
    } else {
      patch(this.container, emptyVNode);
    }
    this.currentVNode = emptyVNode;
    this.previousData = null;
  }
}
