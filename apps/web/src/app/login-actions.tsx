"use client";

import { startAuthentication } from "@simplewebauthn/browser";
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

  function goNext() {
    router.push(nextPath && nextPath.startsWith("/") ? nextPath : "/apps");
    router.refresh();
  }

  async function passkeyLogin() {
    setBusy(true);
    setError(null);
    try {
      const optRes = await fetch("/api/webauthn/login/options", {
        method: "POST",
      });
      const optJson = (await optRes.json()) as {
        error?: string;
        challengeId?: string;
        options?: Parameters<typeof startAuthentication>[0]["optionsJSON"];
      };
      if (!optRes.ok || !optJson.challengeId || !optJson.options) {
        setError(
          optJson.error === "no_credentials"
            ? "Noch kein Passkey — zuerst registrieren"
            : "Login fehlgeschlagen",
        );
        return;
      }

      const assertion = await startAuthentication({
        optionsJSON: optJson.options,
      });

      const verRes = await fetch("/api/webauthn/login/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challengeId: optJson.challengeId,
          response: assertion,
        }),
      });
      if (!verRes.ok) {
        setError("Passkey nicht akzeptiert");
        return;
      }
      goNext();
    } catch (err) {
      setError(
        err instanceof Error && err.name === "NotAllowedError"
          ? "Abgebrochen oder Biometrie nicht verfügbar"
          : "Login fehlgeschlagen",
      );
    } finally {
      setBusy(false);
    }
  }

  async function stubLogin() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/dev/session", { method: "POST" });
      if (!res.ok) {
        setError("Stub-Session fehlgeschlagen");
        return;
      }
      goNext();
    } catch {
      setError("Netzwerkfehler");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="btn-row">
        <button
          type="button"
          className="btn"
          disabled={busy}
          onClick={passkeyLogin}
        >
          {busy ? "…" : "Mit Passkey anmelden"}
        </button>
        {allowDev ? (
          <button
            type="button"
            className="btn btn-ghost"
            disabled={busy}
            onClick={stubLogin}
          >
            Dev: Session setzen
          </button>
        ) : null}
      </div>
      {error ? <p className="error">{error}</p> : null}
    </div>
  );
}
