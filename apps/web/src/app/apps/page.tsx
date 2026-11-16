import { redirect } from "next/navigation";
import { AppLauncherItem } from "@/components/app-icon";
import { getAppsForUser } from "@/lib/apps-catalog";
import { pocketIdUrl, readGateUser, signOutPath } from "@/lib/auth/gate";
import { LogoutButton } from "./logout-button";

export const dynamic = "force-dynamic";

export default async function AppsPage() {
  const session = await readGateUser();
  if (!session) redirect("/");

  const apps = getAppsForUser(session.userId, session.email);
  const securityHref = "/settings/security";
  const logoutHref = signOutPath();

  return (
    <main className="shell">
      <div className="topbar">
        <div>
          <p className="brand">myalabor</p>
          <h1>Apps</h1>
          <p className="muted">Hallo, {session.displayName}</p>
        </div>
        <div className="btn-row" style={{ marginTop: 0 }}>
          <a className="btn btn-ghost" href={securityHref}>
            Sicherheit
          </a>
          {session.role === "admin" ? (
            <a
              className="btn btn-ghost"
              href={pocketIdUrl()}
              target="_blank"
              rel="noopener noreferrer"
            >
              IdP
            </a>
          ) : null}
          <LogoutButton href={logoutHref} />
        </div>
      </div>

      {apps.length === 0 ? (
        <p className="empty">Keine Apps für dieses Konto freigeschaltet.</p>
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
