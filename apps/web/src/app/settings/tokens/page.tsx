import { redirect } from "next/navigation";
import { readSession } from "@/lib/auth/session";
import { TokenManager } from "./token-manager";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function TokensSettingsPage() {
  const session = await readSession();
  if (!session) redirect("/");
  if (session.role !== "admin") redirect("/apps");

  return (
    <main className="shell">
      <p className="brand">myalabor</p>
      <h1>Setup-Tokens</h1>
      <p className="lead">
        Einladungen für neue User oder zusätzliche Geräte. Token nur einmal
        anzeigen — Link kopieren und weitergeben.
      </p>
      <section className="panel">
        <TokenManager />
      </section>
      <p className="muted" style={{ marginTop: "1.25rem" }}>
        <a href="/apps">← zurück zu Apps</a>
      </p>
    </main>
  );
}
