import { redirect } from "next/navigation";
import { AppLauncherItem } from "@/components/app-icon";
import { getAppsCatalog } from "@/lib/apps-catalog";
import { readSession } from "@/lib/auth/session";
import { LogoutButton } from "./logout-button";

export const dynamic = "force-dynamic";

export default async function AppsPage() {
  const session = await readSession();
  if (!session) redirect("/");

  const apps = getAppsCatalog();

  return (
    <main className="shell">
      <div className="topbar">
        <div>
          <p className="brand">myalabor</p>
          <h1>Apps</h1>
          <p className="muted">Hallo, {session.displayName}</p>
        </div>
        <div className="btn-row" style={{ marginTop: 0 }}>
          {session.role === "admin" ? (
            <a className="btn btn-ghost" href="/settings/tokens">
              Tokens
            </a>
          ) : null}
          <LogoutButton />
        </div>
      </div>

      {apps.length === 0 ? (
        <p className="empty">Noch keine Apps konfiguriert.</p>
      ) : (
        <div className="icon-grid">
          {apps.map((app) => (
            <AppLauncherItem key={app.id} app={app} />
          ))}
        </div>
      )}
    </main>
  );
}
