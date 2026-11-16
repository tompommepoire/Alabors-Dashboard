# Cloudflare Tunnel — `dashboard.myalabor.ch`

Stand: M0. Öffentlicher Zugang läuft über den **bestehenden** Cloudflare-Tunnel
(wie `auto.myalabor.ch` → AlaborsCar). Das Dashboard bindet nur Loopback.

## Ziel-Ingress

| Public hostname | Service |
|-----------------|---------|
| `dashboard.myalabor.ch` | `http://127.0.0.1:8790` |
| `einkaufen.myalabor.ch` | `http://127.0.0.1:8791` (Einkaufsliste, bestehend) |

Bestehend (unverändert lassen):

| Public hostname | Service |
|-----------------|---------|
| `auto.myalabor.ch` | `https://localhost:8778` (AlaborsCar) |

## Schritte (Cloudflare Zero Trust UI)

1. Zero Trust → Networks → Tunnels → bestehenden Tunnel öffnen.
2. **Public Hostname** hinzufügen:
   - Subdomain: `dashboard`
   - Domain: `myalabor.ch`
   - Type: HTTP
   - URL: `127.0.0.1:8790`
3. Speichern. DNS-CNAME wird i. d. R. automatisch gesetzt.

Alternativ in `config.yml` des Tunnels (falls dateibasiert):

```yaml
ingress:
  - hostname: dashboard.myalabor.ch
    service: http://127.0.0.1:8790
  - hostname: einkaufen.myalabor.ch
    service: http://127.0.0.1:8791
  - hostname: auto.myalabor.ch
    service: https://localhost:8778
    originRequest:
      noTLSVerify: true
  - service: http_status:404
```

## Smoke nach Deploy

Auf dem Pi (oder per SSH):

```bash
wget -qO- http://127.0.0.1:8790/api/health
```

Von außen (nach Ingress):

```bash
curl -fsS https://dashboard.myalabor.ch/api/health
```

Erwartet: JSON `{"ok":true,"service":"alabors-dashboard",…}`.

## Hinweise

- Dashboard-Prozess: siehe `scripts/deploy-pi.sh` und `deploy/bin/dashboard-pi-run.sh`.
- Port **8790** (nicht 8780 — das nutzt Voicemessage Manager auf dem Pi).
- Kein neuer öffentlicher Port auf dem Router.
- WebAuthn (M1) braucht exakt `WEBAUTHN_RP_ID=dashboard.myalabor.ch` und
  `WEBAUTHN_ORIGIN=https://dashboard.myalabor.ch`.
- Boot-Autostart (piCore `bootlocal`) analog AlaborsCar — Follow-up nach M0.
