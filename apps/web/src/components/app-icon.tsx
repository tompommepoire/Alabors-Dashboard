"use client";

import type { MouseEvent } from "react";
import type { CatalogApp } from "@/lib/apps-catalog";
import {
  ANDROID_FIREFOX_PACKAGE,
  isAndroidUserAgent,
  toAndroidBrowserIntent,
} from "@/lib/external-browser";

/** Bump when icons change so CDNs/browsers refetch. */
const ICON_REV = "3";

const ICON_SRC: Record<CatalogApp["icon"], string> = {
  cart: `/icons/apps/cart.svg?v=${ICON_REV}`,
  tv: `/icons/apps/tv.svg?v=${ICON_REV}`,
  car: `/icons/apps/car.svg?v=${ICON_REV}`,
  cards: `/icons/apps/cards.svg?v=${ICON_REV}`,
  notes: `/icons/apps/notes.svg?v=${ICON_REV}`,
  server: `/icons/apps/server.png?v=${ICON_REV}`,
};

export function AppIcon({ icon }: { icon: CatalogApp["icon"] }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className="app-icon-img"
      src={ICON_SRC[icon]}
      alt=""
      width={72}
      height={72}
      draggable={false}
    />
  );
}

function subtitle(app: CatalogApp): string {
  if (app.launchNote) return app.launchNote;
  if (app.network === "lan") return "Nur Heimnetz · öffnet Firefox";
  if (app.authMode === "inherit" && app.handoff === "none") {
    return "Noch kein inherit — Gate only";
  }
  return app.description;
}

/** LAN http from a PWA/Custom-Tab often fails; hand off to the system browser on Android. */
function shouldOpenExternalBrowser(app: CatalogApp): boolean {
  if (app.network !== "lan") return false;
  if (typeof navigator === "undefined") return false;
  return isAndroidUserAgent(navigator.userAgent);
}

export function AppLauncherItem({
  app,
}: {
  app: CatalogApp;
}) {
  const title = [app.description, app.launchNote].filter(Boolean).join(" — ");

  function onClick(e: MouseEvent<HTMLAnchorElement>) {
    if (!shouldOpenExternalBrowser(app)) return;
    // Chrome Android cannot reliably open cleartext LAN http (HTTPS-First /
    // local-network). Firefox can — and must stay on http:// to avoid a
    // useless local-CA warning (Firefox ignores the system CA store).
    const intent = toAndroidBrowserIntent(app.url, {
      packageName: ANDROID_FIREFOX_PACKAGE,
    });
    if (!intent) return;
    e.preventDefault();
    window.location.assign(intent);
  }

  return (
    <a
      className="app-icon"
      href={app.url}
      target="_blank"
      rel="noopener noreferrer"
      title={title}
      onClick={onClick}
    >
      <span className="app-icon-tile">
        <AppIcon icon={app.icon} />
        {app.network === "lan" ? (
          <span className="app-icon-lan" aria-label="Nur Heimnetz">
            LAN
          </span>
        ) : null}
      </span>
      <span className="app-icon-label">{app.name}</span>
      <span className="app-icon-meta">{subtitle(app)}</span>
    </a>
  );
}
