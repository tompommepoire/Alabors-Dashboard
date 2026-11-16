"use client";

/**
 * Top-level navigation to oauth2-proxy sign_out → Pocket ID end-session.
 * fetch()/XHR cannot clear the proxy session cookie reliably.
 */
export function LogoutButton({ href }: { href: string }) {
  return (
    <button
      type="button"
      className="btn btn-ghost"
      onClick={() => window.location.assign(href)}
    >
      Abmelden
    </button>
  );
}
