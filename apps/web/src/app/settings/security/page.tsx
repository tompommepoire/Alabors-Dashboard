import { redirect } from "next/navigation";
import { pocketIdUrl, readGateUser } from "@/lib/auth/gate";

export const dynamic = "force-dynamic";

export default async function SecurityPage() {
  const session = await readGateUser();
  if (!session) redirect("/");

  const base = pocketIdUrl().replace(/\/$/, "");

  return (
    <main className="shell">
      <p className="brand">myalabor</p>
      <h1>Sicherheit</h1>
      <p className="lead">
        Passkeys, Sessions und Erstkeys liegen bei Pocket ID — das Dashboard
        ist nur Tor und Katalog.
      </p>
      <p className="muted">
        Vertrag:{" "}
        <a
          href="https://github.com/tompommepoire/alabor-harness/blob/main/docs/AUTH-HARNESS.md"
          target="_blank"
          rel="noopener noreferrer"
        >
          AUTH-HARNESS.md
        </a>
      </p>

      <ul className="security-list">
        <li>
          <a
            className="btn"
            href={base}
            target="_blank"
            rel="noopener noreferrer"
          >
            Pocket ID öffnen
          </a>
          <p className="muted">
            Passkeys listen/hinzufügen/entfernen und Sessions beenden (§3c
            Self-Service in der IdP-UI).
          </p>
        </li>
        {session.role === "admin" ? (
          <li>
            <a
              className="btn"
              href={base}
              target="_blank"
              rel="noopener noreferrer"
            >
              Admin / Einladungen
            </a>
            <p className="muted">
              1×-Erstkeys (Invites) in Pocket ID ausstellen — kein zweites
              Invite-System im Dashboard.
            </p>
          </li>
        ) : null}
      </ul>

      <p style={{ marginTop: "1.5rem" }}>
        <a className="btn btn-ghost" href="/apps">
          ← Apps
        </a>
      </p>
    </main>
  );
}
