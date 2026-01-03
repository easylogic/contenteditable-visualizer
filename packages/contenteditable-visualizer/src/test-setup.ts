/**
 * Test setup for vitest
 * Mocks browser APIs that are not available in Node.js
 */

// Mock indexedDB for jsdom using fake-indexeddb
// This provides a more complete IndexedDB implementation for testing
if (typeof globalThis.indexedDB === 'undefined') {
  // Use a simple mock that works with our test needs
  let dbStore: Map<number, any> = new Map();
  let autoIncrement = 1;

  const mockIndexedDB = {
    open: (name: string, version?: number) => {
      const request: any = {
        onsuccess: null,
        onerror: null,
        onupgradeneeded: null,
        result: {
          createObjectStore: (storeName: string, options?: any) => {
            return {
              createIndex: () => {},
              add: (value: any) => {
                const id = options?.autoIncrement ? autoIncrement++ : value.id;
                dbStore.set(id, { ...value, id });
                return { result: id };
              },
              get: (key: number) => {
                return { result: dbStore.get(key) || null };
              },
              getAll: () => {
                return { result: Array.from(dbStore.values()) };
              },
              delete: (key: number) => {
                dbStore.delete(key);
                return { result: undefined };
              },
              clear: () => {
                dbStore.clear();
                return { result: undefined };
              },
              index: (name: string) => {
                return {
                  getAll: () => {
                    return { result: Array.from(dbStore.values()) };
                  },
                };
              },
            };
          },
          objectStoreNames: {
            contains: (name: string) => name === 'snapshots',
          },
          transaction: (storeNames: string[], mode: string) => {
            return {
              objectStore: (storeName: string) => {
                return {
                  add: (value: any) => {
                    const id = autoIncrement++;
                    dbStore.set(id, { ...value, id });
                    const req: any = { result: id, onsuccess: null, onerror: null };
                    setTimeout(() => req.onsuccess?.({ target: req }), 0);
                    return req;
                  },
                  get: (key: number) => {
                    const req: any = { result: dbStore.get(key) || null, onsuccess: null, onerror: null };
                    setTimeout(() => req.onsuccess?.({ target: req }), 0);
                    return req;
                  },
                  getAll: () => {
                    const req: any = { result: Array.from(dbStore.values()), onsuccess: null, onerror: null };
                    setTimeout(() => req.onsuccess?.({ target: req }), 0);
                    return req;
                  },
                  delete: (key: number) => {
                    dbStore.delete(key);
                    const req: any = { result: undefined, onsuccess: null, onerror: null };
                    setTimeout(() => req.onsuccess?.({ target: req }), 0);
                    return req;
                  },
                  clear: () => {
                    dbStore.clear();
                    const req: any = { result: undefined, onsuccess: null, onerror: null };
                    setTimeout(() => req.onsuccess?.({ target: req }), 0);
                    return req;
                  },
                  index: (name: string) => {
                    return {
                      getAll: () => {
                        const req: any = { result: Array.from(dbStore.values()), onsuccess: null, onerror: null };
                        setTimeout(() => req.onsuccess?.({ target: req }), 0);
                        return req;
                      },
                    };
                  },
                };
              },
            };
          },
        },
      };

      // Simulate async open
      setTimeout(() => {
        if (request.onupgradeneeded) {
          request.onupgradeneeded({ target: request });
        }
        if (request.onsuccess) {
          request.onsuccess({ target: request });
        }
      }, 0);

      return request;
    },
  };

  (globalThis as any).indexedDB = mockIndexedDB;
  
  // Reset store before each test
  (globalThis as any).__resetIndexedDB = () => {
    dbStore.clear();
    autoIncrement = 1;
  };
}
