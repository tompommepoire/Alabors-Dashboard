import { redirect } from "next/navigation";
import { readSession } from "@/lib/auth/session";
import { countUsers } from "@/lib/db";
import { LoginActions } from "./login-actions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const session = await readSession();
  const params = await searchParams;
  if (session) {
    redirect(params.next && params.next.startsWith("/") ? params.next : "/apps");
  }

  const allowDev = process.env.ALLOW_DEV_SESSION === "1";
  const hasUsers = countUsers() > 0;

  return (
    <main className="shell">
      <p className="brand">myalabor</p>
      <h1>Dashboard</h1>
      <p className="lead">
        Geschützter Einstieg zu deinen Apps. Anmeldung per Passkey
        (Fingerprint / Face / PIN).
      </p>
      <section className="panel">
        {hasUsers ? (
          <p className="muted">Mit registriertem Gerät fortfahren.</p>
        ) : (
          <p className="muted">
            Noch kein User. Mit Bootstrap-/Setup-Token unter{" "}
            <a href="/register">/register</a> den ersten Admin anlegen.
          </p>
        )}
        <LoginActions allowDev={allowDev} nextPath={params.next} />
        <p className="muted" style={{ marginTop: "1rem" }}>
          Neues Gerät? <a href="/register">Passkey registrieren</a>
        </p>
      </section>
    </main>
  );
}
