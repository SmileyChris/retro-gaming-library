// Mock Svelte 5 runes for testing
globalThis.$state = (initial) => initial;
globalThis.$derived = (fn) => (typeof fn === "function" ? fn() : fn);
globalThis.$effect = () => {};
globalThis.$props = () => ({});
