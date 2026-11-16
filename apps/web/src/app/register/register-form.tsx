"use client";

import { startRegistration } from "@simplewebauthn/browser";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function RegisterForm({ initialToken }: { initialToken: string }) {
  const router = useRouter();
  const [token, setToken] = useState(initialToken);
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const optRes = await fetch("/api/webauthn/register/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, displayName }),
      });
      const optJson = (await optRes.json()) as {
        error?: string;
        challengeId?: string;
        options?: Parameters<typeof startRegistration>[0]["optionsJSON"];
        bound?: boolean;
      };
      if (!optRes.ok || !optJson.challengeId || !optJson.options) {
        setError(mapError(optJson.error));
        return;
      }

      const attestation = await startRegistration({
        optionsJSON: optJson.options,
      });

      const verRes = await fetch("/api/webauthn/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challengeId: optJson.challengeId,
          token,
          response: attestation,
        }),
      });
      const verJson = (await verRes.json()) as { error?: string };
      if (!verRes.ok) {
        setError(mapError(verJson.error));
        return;
      }

      router.push("/apps");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error && err.name === "NotAllowedError"
          ? "Abgebrochen oder Biometrie nicht verfügbar"
          : "Registrierung fehlgeschlagen",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="form">
      <label className="field">
        <span>Setup-Token</span>
        <input
          value={token}
          onChange={(e) => setToken(e.target.value)}
          autoComplete="off"
          required
          spellCheck={false}
        />
      </label>
      <label className="field">
        <span>Anzeigename</span>
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          autoComplete="nickname"
          minLength={2}
          required
          placeholder="z. B. Tom"
        />
      </label>
      <div className="btn-row">
        <button type="submit" className="btn" disabled={busy}>
          {busy ? "…" : "Passkey erstellen"}
        </button>
        <Link className="btn btn-ghost" href="/">
          Zum Login
        </Link>
      </div>
      {error ? <p className="error">{error}</p> : null}
    </form>
  );
}

function mapError(code?: string): string {
  switch (code) {
    case "invalid_token":
      return "Ungültiges oder abgelaufenes Token";
    case "display_name_required":
      return "Anzeigename fehlt";
    case "challenge_expired":
      return "Challenge abgelaufen — bitte erneut versuchen";
    default:
      return "Registrierung fehlgeschlagen";
  }
}
