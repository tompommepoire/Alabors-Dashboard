export function getRpId(): string {
  return (
    process.env.WEBAUTHN_RP_ID?.trim() ||
    (process.env.NODE_ENV === "production" ? "dashboard.myalabor.ch" : "localhost")
  );
}

export function getRpName(): string {
  return "Alabor Dashboard";
}

export function getExpectedOrigin(): string {
  return (
    process.env.WEBAUTHN_ORIGIN?.trim() ||
    (process.env.NODE_ENV === "production"
      ? "https://dashboard.myalabor.ch"
      : "http://localhost:3000")
  );
}

/** Accept localhost variants in development. */
export function getExpectedOrigins(): string | string[] {
  const primary = getExpectedOrigin();
  if (process.env.NODE_ENV === "production") return primary;
  const extras = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8790",
    "http://127.0.0.1:8790",
  ];
  return Array.from(new Set([primary, ...extras]));
}
