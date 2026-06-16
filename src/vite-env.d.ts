/// <reference types="vite/client" />

// Raw markdown imports (Vite `?raw` suffix) — used by the legal policy pages.
declare module '*.md?raw' {
  const content: string;
  export default content;
}
