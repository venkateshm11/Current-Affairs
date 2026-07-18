import '@testing-library/jest-dom';

// jsdom has no ResizeObserver; Recharts' ResponsiveContainer needs it. Minimal stub for tests.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
