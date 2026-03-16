import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock performance.now if not available
if (typeof performance === 'undefined') {
  (global as any).performance = {
    now: () => Date.now(),
  };
}

if (typeof (global as any).ResizeObserver === 'undefined') {
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }

  (global as any).ResizeObserver = ResizeObserverMock;
}
