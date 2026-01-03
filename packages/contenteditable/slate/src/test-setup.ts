// Mock indexedDB for jsdom environment
import { vi } from 'vitest';

// Create a simple mock for indexedDB
class MockIDBRequest {
  onerror: ((event: any) => void) | null = null;
  onsuccess: ((event: any) => void) | null = null;
  onupgradeneeded: ((event: any) => void) | null = null;
  result: any = null;
  error: any = null;
  readyState: string = 'pending';
}

class MockIDBIndex {
  getAll = vi.fn(() => {
    const req = new MockIDBRequest();
    req.result = [];
    return req;
  });
  get = vi.fn(() => new MockIDBRequest());
}

class MockIDBDatabase {
  createObjectStore = vi.fn(() => new MockIDBObjectStore());
  transaction = vi.fn(() => new MockIDBTransaction());
}

class MockIDBObjectStore {
  index = vi.fn((name: string) => new MockIDBIndex());
  get = vi.fn(() => new MockIDBRequest());
  getAll = vi.fn(() => {
    const req = new MockIDBRequest();
    req.result = [];
    return req;
  });
  add = vi.fn(() => new MockIDBRequest());
  put = vi.fn(() => new MockIDBRequest());
  delete = vi.fn(() => new MockIDBRequest());
}

class MockIDBTransaction {
  objectStore = vi.fn(() => new MockIDBObjectStore());
}

const mockIndexedDB = {
  open: vi.fn((name: string, version?: number) => {
    const request = new MockIDBRequest();
    // Simulate successful open
    setTimeout(() => {
      request.result = new MockIDBDatabase();
      request.readyState = 'done';
      if (request.onsuccess) {
        request.onsuccess({ target: request } as any);
      }
    }, 0);
    return request;
  }),
};

// @ts-ignore
global.indexedDB = mockIndexedDB as any;
