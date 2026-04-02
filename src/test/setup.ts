import '@testing-library/jest-dom';

// jsdom doesn't implement scrollTo; the app calls it on navigation.
Object.defineProperty(window, 'scrollTo', { value: () => {}, writable: true });

Element.prototype.scrollIntoView = function () {};

// jsdom does not load remote images, so fire image onload after src assignment.
Object.defineProperty(window.HTMLImageElement.prototype, 'src', {
  set(value: string) {
    this.setAttribute('src', value);
    setTimeout(() => {
      if (typeof this.onload === 'function') {
        this.onload(new Event('load'));
      }
    }, 0);
  },
  get() {
    return this.getAttribute('src') || '';
  },
});
