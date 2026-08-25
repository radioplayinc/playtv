// Stub for @tanstack/react-start in static/SPA builds.
// createServerFn becomes a passthrough — functions run client-side.
export function createServerFn(_opts?: any) {
  return function register(fn: any) {
    const callable = (...args: any[]) => fn(...args);
    callable.url = "/api/noop";
    return callable;
  };
}

export function createMiddleware() {
  return { middleware: () => ({}) };
}

export function json(data: any, _init?: any) {
  return data;
}
