export function safeNextPath(next: string | null): string | null {
  if (!next) return null;
  if (!next.startsWith('/') || next.startsWith('//')) return null;
  return next;
}
