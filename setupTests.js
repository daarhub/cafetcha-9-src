// jest-dom adds custom jest matchers for asserting on DOM nodes.
import '@testing-library/jest-dom';

// The homepage menu uses IntersectionObserver for its reveal animation.
// JSDOM does not provide it, so provide the small test-only surface the
// component needs. The callback is intentionally not invoked here; the test
// only needs mount/render to complete without a ReferenceError.
if (!global.IntersectionObserver) {
  global.IntersectionObserver = class IntersectionObserverMock {
    observe() {}

    unobserve() {}

    disconnect() {}

    takeRecords() {
      return [];
    }
  };
}
