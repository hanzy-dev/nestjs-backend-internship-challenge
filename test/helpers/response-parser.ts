export function parseJson<T>(text: string): T {
  const value: unknown = JSON.parse(text);
  return value as T;
}
