/** Fail closed: only http(s) destinations may leave the resolver API. */
export function isSafeRedirectDestination(destination: string): boolean {
  try {
    const url = new URL(destination);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}
