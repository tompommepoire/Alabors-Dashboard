# Cloudflare Tunnel — myalabor Auth-Tor

Stand: Tor-1. Edge bleibt der bestehende Tunnel; Auth-Wahrheit ist Pocket ID + oauth2-proxy auf dem Pi.

## Ziel-Ingress

| Public hostname | Service |
|-----------------|---------|
| `auth.myalabor.ch` | `http://127.0.0.1:1411` (Pocket ID) |
| `dashboard.myalabor.ch` | `http://127.0.0.1:4180` (oauth2-proxy → dashboard `:8790`) |
| `einkaufen.myalabor.ch` | `http://127.0.0.1:4181` (oauth2-proxy → Einkauf) |
| `anki-lern.myalabor.ch` | `http://127.0.0.1:4182` (oauth2-proxy → Anki, sobald live) |
| `notes.myalabor.ch` | `http://127.0.0.1:4183` (oauth2-proxy → Notes, sobald live) |

Bestehend (unverändert lassen, bis hinter Gate gezogen):

| Public hostname | Service |
|-----------------|---------|
| `auto.myalabor.ch` | `https://localhost:8778` (AlaborsCar) |

Ports `418x` sind Beispiele — an [deploy/auth](../../deploy/auth) anpassen.

## config.yml (Skizze)

```yaml
ingress:
  - hostname: auth.myalabor.ch
    service: http://127.0.0.1:1411
  - hostname: dashboard.myalabor.ch
    service: http://127.0.0.1:4180
  - hostname: einkaufen.myalabor.ch
    service: http://127.0.0.1:4181
  - hostname: auto.myalabor.ch
    service: https://localhost:8778
    originRequest:
      noTLSVerify: true
  - service: http_status:404
```

## Schritte (Zero Trust UI)

1. Tunnels → bestehenden Tunnel.  
2. Public Hostname `auth` → HTTP `127.0.0.1:1411`.  
3. `dashboard` / Apps auf die jeweiligen Proxy-Ports umstellen (nicht mehr direkt `:8790`).  
4. DNS-CNAME prüfen.

## Smoke

```bash
curl -fsS https://auth.myalabor.ch/ >/dev/null
curl -fsS http://127.0.0.1:8790/api/health   # loopback ohne Gate
curl -fsSI https://dashboard.myalabor.ch/apps  # erwartet Redirect zum IdP ohne Cookie
```

## Hinweise

- Dashboard-Prozess weiter loopback `:8790`; öffentlich nur über Proxy.  
- WebAuthn-RP-ID ist der **IdP-Host** (`auth.myalabor.ch`), nicht `dashboard`.  
- Kein neuer Router-Port.
