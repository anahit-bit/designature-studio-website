import '@testing-library/jest-dom';

// jsdom doesn't implement scrollTo; the app calls it on navigation.
Object.defineProperty(window, 'scrollTo', { value: () => {}, writable: true });
