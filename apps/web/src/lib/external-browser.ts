/** Firefox release — LAN http works there; Chrome often blocks private-net cleartext. */
export const ANDROID_FIREFOX_PACKAGE = "org.mozilla.firefox";

export type AndroidBrowserIntentOpts = {
  /** Pin to a browser package (no chooser). Empty = system chooser. */
  packageName?: string;
};

/** Android Intent that hands http(s) to a real browser (escapes Custom Tabs / PWA sheet). */
export function toAndroidBrowserIntent(
  url: string,
  opts: AndroidBrowserIntentOpts = {},
): string | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;

  const scheme = u.protocol.replace(":", "");
  const path = `${u.host}${u.pathname || "/"}${u.search}`;
  const fallback = encodeURIComponent(url);
  const pkg = opts.packageName?.trim()
    ? `package=${opts.packageName.trim()};`
    : "";
  return (
    `intent://${path}#Intent;scheme=${scheme};` +
    `action=android.intent.action.VIEW;` +
    `category=android.intent.category.BROWSABLE;` +
    pkg +
    `S.browser_fallback_url=${fallback};end`
  );
}

export function isAndroidUserAgent(ua: string): boolean {
  return /Android/i.test(ua);
}
