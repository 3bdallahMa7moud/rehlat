export function createLocalId(prefix: string, now = Date.now(), random = Math.random): string {
  return `${prefix}-${now.toString(36)}-${random().toString(36).slice(2, 8)}`;
}
