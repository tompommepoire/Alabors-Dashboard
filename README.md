# Alabors Dashboard

Privater App-Launcher unter `dashboard.myalabor.ch` (Passkey-Auth ab M1).

- PRD: [docs/PRD.md](docs/PRD.md)
- Architektur: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- Tunnel: [docs/ops/cloudflare-tunnel.md](docs/ops/cloudflare-tunnel.md)

## Lokal

```bash
cd apps/web
cp .env.example .env.local   # SESSION_SECRET + SETUP_BOOTSTRAP_SECRET setzen
npm install
npm run dev
```

- Health: http://127.0.0.1:3000/api/health  
- Erster Admin: `/register` mit Bootstrap-Secret + Passkey (localhost)
- Danach Login per Passkey; Admin → `/settings/tokens` für weitere Einladungen
- Optional `ALLOW_DEV_SESSION=1`: Stub-Login ohne Biometrie

## Deploy auf den Pi

```bash
cp deploy/pi.env.example deploy/pi.env
HARNESS_CONFIRM=1 ./scripts/deploy-pi.sh
./scripts/deploy-pi.sh smoke
```

Baut standalone auf dem Dev-Host, rsync’t inkl. Node linux-arm64 nach
`/mnt/mmcblk0p2/dashboard`, startet auf `127.0.0.1:8790`.

Danach Cloudflare-Ingress laut `docs/ops/cloudflare-tunnel.md`.

## MVP-Apps

Einkaufsliste, Lumito (LAN), Car-App (`auto.myalabor.ch`).
