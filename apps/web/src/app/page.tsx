import { redirect } from "next/navigation";
import { readGateUser } from "@/lib/auth/gate";
import { LoginActions } from "./login-actions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const session = await readGateUser();
  const params = await searchParams;
  if (session) {
    redirect(params.next && params.next.startsWith("/") ? params.next : "/apps");
  }

  const allowDev = process.env.ALLOW_DEV_SESSION === "1";
  const pocketId =
    process.env.POCKET_ID_URL?.trim() || "https://auth.myalabor.ch";

  return (
    <main className="shell">
      <p className="brand">myalabor</p>
      <h1>Dashboard</h1>
      <p className="lead">
        Tor und App-Katalog. Anmeldung über Pocket ID (Passkey) hinter dem
        Gate — nicht in dieser App.
      </p>
      <section className="panel">
        <p className="muted">
          In Produktion leitet oauth2-proxy ungeautentifizierte Requests zum
          IdP um. Lokal: Dev-Session nutzen.
        </p>
        <p className="muted">
          IdP:{" "}
          <a href={pocketId} rel="noopener noreferrer">
            {pocketId}
          </a>
        </p>
        <LoginActions allowDev={allowDev} nextPath={params.next} />
      </section>
    </main>
  );
}
