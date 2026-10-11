/** Only return to a page within this application after authentication. */
export function safeReturnPath(value: string | null | undefined) {
  if (!value?.startsWith("/") || value.startsWith("//") || /[\\\r\n]/.test(value)) return "/dashboard";
  try {
    const url = new URL(value, "https://app.local");
    return url.origin === "https://app.local" ? url.pathname + url.search : "/dashboard";
  } catch {
    return "/dashboard";
  }
}
