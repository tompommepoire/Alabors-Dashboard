import type { CatalogApp } from "@/lib/apps-catalog";

const ICON_SRC: Record<CatalogApp["icon"], string> = {
  cart: "/icons/apps/cart.svg",
  tv: "/icons/apps/tv.svg",
  car: "/icons/apps/car.svg",
  cards: "/icons/apps/cards.svg",
  notes: "/icons/apps/notes.svg",
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

export function AppLauncherItem({
  app,
}: {
  app: CatalogApp;
}) {
  return (
    <a
      className="app-icon"
      href={app.url}
      target="_blank"
      rel="noopener noreferrer"
      title={app.description}
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
    </a>
  );
}
