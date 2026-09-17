export function parseCheckDiScanValue(rawValue: string) {
  const value = rawValue.trim();
  if (!value) return "";

  try {
    const url = new URL(value);
    const match = url.pathname.match(/\/verify\/([^/?#]+)/i);
    if (match?.[1]) return decodeURIComponent(match[1]);
  } catch {
    // Raw public IDs are valid input too.
  }

  const pathMatch = value.match(/\/verify\/([^/?#]+)/i);
  if (pathMatch?.[1]) return decodeURIComponent(pathMatch[1]);
  return value.replace(/[^a-zA-Z0-9_-]/g, "");
}
