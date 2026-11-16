export type AppNetwork = "public" | "lan";

export type CatalogApp = {
  id: string;
  name: string;
  description: string;
  url: string;
  icon: "cart" | "tv" | "car" | "cards";
  network: AppNetwork;
};

/** Server-only catalog. Sensitive URLs come from env. */
export function getAppsCatalog(): CatalogApp[] {
  const apps: CatalogApp[] = [
    {
      id: "einkaufsliste",
      name: "Einkaufsliste",
      description: "Familienliste",
      url: process.env.EINKAUF_URL?.trim() || "",
      icon: "cart",
      network: "public",
    },
    {
      id: "lumito",
      name: "Lumito",
      description: "Haus-IPTV",
      url: (process.env.LUMITO_URL ?? "http://192.168.1.172:8080/").trim(),
      icon: "tv",
      network: "lan",
    },
    {
      id: "alabors-drive",
      name: "Car-App",
      description: "eDrive / SoC",
      url: (
        process.env.ALABORS_DRIVE_URL ??
        "https://auto.myalabor.ch/web/drive.html"
      ).trim(),
      icon: "car",
      network: "public",
    },
    {
      id: "apple-anki",
      name: "Anki Lernen",
      description: "Karteikarten-PWA",
      url: (
        process.env.ANKI_LERN_URL ?? "https://anki-lern.myalabor.ch/"
      ).trim(),
      icon: "cards",
      network: "public",
    },
  ];
  return apps.filter((app) => app.url.length > 0);
}
