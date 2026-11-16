# Alabors Dashboard

Privater App-Launcher unter `dashboard.myalabor.ch` — **Tor / Katalog**, nicht App-Auth.

**Auth-Vertrag (Source of Truth):**  
[alabor-harness/docs/AUTH-HARNESS.md](https://github.com/tompommepoire/alabor-harness/blob/main/docs/AUTH-HARNESS.md)

Passkeys und Sessions liegen bei **Pocket ID** (`auth.myalabor.ch`) + **oauth2-proxy** (Forward-Auth). Das Dashboard katalogisiert Apps und startet sie hinter dem Gate — ohne eigene Passkey-Verifier und ohne Pair-Tokens in URLs.

- PRD: [docs/PRD.md](docs/PRD.md)
- Architektur: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- §4 Checkliste (Tor): [docs/AUTH-CHECKLIST.md](docs/AUTH-CHECKLIST.md)
- Pocket ID: [docs/ops/pocket-id.md](docs/ops/pocket-id.md)
- Forward-Auth: [docs/ops/oauth2-proxy.md](docs/ops/oauth2-proxy.md)
- Tunnel: [docs/ops/cloudflare-tunnel.md](docs/ops/cloudflare-tunnel.md)
- Später Exchange/`inherit`: [docs/AUTH-EXCHANGE.md](docs/AUTH-EXCHANGE.md)

## Lokal (ohne Proxy)

```bash
cd apps/web
cp .env.example .env.local   # AUTH_MODE=dev, ALLOW_DEV_SESSION=1
npm install
npm run dev
```

- Health: http://127.0.0.1:3000/api/health  
- Dev-Login ohne Biometrie wenn `ALLOW_DEV_SESSION=1`

## Produktiv

1. Pocket ID + oauth2-proxy auf dem Pi ([deploy/auth](deploy/auth)).
2. Tunnel-Hosts → Proxy (Apps + Dashboard); `auth.myalabor.ch` → Pocket ID.
3. Dashboard mit `AUTH_MODE=proxy` hinter dem Gate.

```bash
cp deploy/pi.env.example deploy/pi.env
HARNESS_CONFIRM=1 ./scripts/deploy-pi.sh
./scripts/deploy-pi.sh smoke
```

## Katalog-Apps

Einkaufen (`shared`), Lumito (`choose`+`app-local`), Car-App, Anki / Notes (Soll `inherit`, Ist-Übergabe `none` — ehrlich kennzeichnen).
