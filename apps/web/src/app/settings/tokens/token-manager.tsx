"use client";

import { useCallback, useEffect, useState } from "react";

type TokenListItem = {
  id: string;
  label: string;
  expiresAt: string;
  usesLeft: number;
  createdAt: string;
};

type CreatedToken = {
  id: string;
  label: string;
  token: string;
  registerUrl: string;
  expiresAt: string;
};

export function TokenManager() {
  const [tokens, setTokens] = useState<TokenListItem[]>([]);
  const [label, setLabel] = useState("");
  const [created, setCreated] = useState<CreatedToken | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/setup-tokens");
    if (!res.ok) {
      setError("Tokens konnten nicht geladen werden");
      return;
    }
    const json = (await res.json()) as { tokens: TokenListItem[] };
    setTokens(json.tokens);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createToken(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setCreated(null);
    try {
      const res = await fetch("/api/admin/setup-tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: label || "invite" }),
      });
      const json = (await res.json()) as CreatedToken & { error?: string };
      if (!res.ok) {
        setError("Anlegen fehlgeschlagen");
        return;
      }
      setCreated(json);
      setLabel("");
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    setBusy(true);
    try {
      await fetch(`/api/admin/setup-tokens?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* ignore */
    }
  }

  return (
    <div>
      <form onSubmit={createToken} className="form">
        <label className="field">
          <span>Label</span>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="z. B. Anna iPhone"
          />
        </label>
        <div className="btn-row">
          <button type="submit" className="btn" disabled={busy}>
            Token erzeugen
          </button>
        </div>
      </form>

      {created ? (
        <div className="copy-box">
          <p className="muted">Einmalig sichtbar — jetzt kopieren:</p>
          <p className="mono" style={{ marginTop: "0.5rem" }}>
            {created.registerUrl}
          </p>
          <div className="btn-row">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => copy(created.registerUrl)}
            >
              Link kopieren
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => copy(created.token)}
            >
              Token kopieren
            </button>
          </div>
        </div>
      ) : null}

      {error ? <p className="error">{error}</p> : null}

      <table className="table" style={{ marginTop: "1.5rem" }}>
        <thead>
          <tr>
            <th>Label</th>
            <th>Gültig bis</th>
            <th>Rest</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {tokens.length === 0 ? (
            <tr>
              <td colSpan={4} className="muted">
                Noch keine Tokens
              </td>
            </tr>
          ) : (
            tokens.map((t) => (
              <tr key={t.id}>
                <td>{t.label}</td>
                <td>{new Date(t.expiresAt).toLocaleString("de-CH")}</td>
                <td>{t.usesLeft}</td>
                <td>
                  {t.usesLeft > 0 ? (
                    <button
                      type="button"
                      className="btn btn-ghost"
                      disabled={busy}
                      onClick={() => revoke(t.id)}
                    >
                      Invalidieren
                    </button>
                  ) : (
                    <span className="muted">verbraucht</span>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
