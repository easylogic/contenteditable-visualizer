// Mock indexedDB for jsdom environment
import { vi } from 'vitest';

const mockIndexedDB = {
  open: vi.fn(() => ({
    onerror: null,
    onsuccess: null,
    onupgradeneeded: null,
    result: {
      createObjectStore: vi.fn(),
      transaction: vi.fn(() => ({
        objectStore: vi.fn(() => ({
          get: vi.fn(() => ({
            onsuccess: null,
            onerror: null,
            result: null,
          })),
          getAll: vi.fn(() => ({
            onsuccess: null,
            onerror: null,
            result: [],
          })),
          add: vi.fn(() => ({
            onsuccess: null,
            onerror: null,
          })),
          put: vi.fn(() => ({
            onsuccess: null,
            onerror: null,
          })),
          delete: vi.fn(() => ({
            onsuccess: null,
            onerror: null,
          })),
        })),
      })),
    },
  })),
};

// @ts-ignore
global.indexedDB = mockIndexedDB as any;
