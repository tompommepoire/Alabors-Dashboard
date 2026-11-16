"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoginActions({
  allowDev,
  nextPath,
}: {
  allowDev: boolean;
  nextPath?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function devLogin() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/dev/session", { method: "POST" });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error || `HTTP ${res.status}`);
      }
      router.push(nextPath && nextPath.startsWith("/") ? nextPath : "/apps");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Dev-Login fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="btn-row">
      {allowDev ? (
        <button
          type="button"
          className="btn"
          disabled={busy}
          onClick={() => void devLogin()}
        >
          {busy ? "…" : "Dev-Session"}
        </button>
      ) : (
        <p className="muted">
          Ohne Gate-Headers erreichst du diese Seite nur lokal mit{" "}
          <code>ALLOW_DEV_SESSION=1</code>.
        </p>
      )}
      {error ? <p className="error">{error}</p> : null}
    </div>
  );
}
