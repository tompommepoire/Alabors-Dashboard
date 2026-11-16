# oauth2-proxy — Forward-Auth vor Apps

Gate vor `dashboard`, `einkaufen`, `anki-lern`, `notes`, …  
OIDC upstream = Pocket ID (`auth.myalabor.ch`).

## Rolle

Request ohne gültige Session → Login am IdP. Mit Session → Upstream + Identity-Headers.

Empfohlene Cookie-/Session-Policy an Harness §2 anbinden soweit der Proxy es erlaubt (Idle ~14 d / Absolut ~90 d).

## Pi (piCore — Binary)

```bash
HARNESS_CONFIRM=1 ./scripts/deploy-oauth2-proxy-binary.sh
# dann Client-ID/Secret in /mnt/mmcblk0p2/auth/oauth2-proxy-dashboard.env
HARNESS_CONFIRM=1 ./scripts/deploy-oauth2-proxy-binary.sh start
```

Config: [deploy/auth/oauth2-proxy-dashboard.cfg](../../deploy/auth/oauth2-proxy-dashboard.cfg)  
Scopes setzt der Proxy (`openid email profile`) — nicht das Pocket-ID-Formular.

Docker-Compose unter [deploy/auth](../../deploy/auth) nur für Hosts mit Docker.

## Tunnel

Öffentliche Hostnames zeigen auf den Proxy-Port (nicht direkt auf die App), außer `auth.myalabor.ch` → Pocket ID.

Minimal-Variante für den Start: **eine Proxy-Instanz pro Hostname** (klare Upstream-URL) — skaliert für Haushaltsgröße.

## Dashboard Env

```
AUTH_MODE=proxy
POCKET_ID_URL=https://auth.myalabor.ch
DASHBOARD_PUBLIC_URL=https://dashboard.myalabor.ch
OAUTH2_SIGN_OUT_URL=https://dashboard.myalabor.ch/oauth2/sign_out
ADMIN_SUBJECTS=<pocket-id-email-or-sub>
```

## Logout (Proxy + IdP)

Abmelden muss **beide** Sessions beenden: oauth2-proxy-Cookie und Pocket-ID-UI-Session.
Sonst leitet `/oauth2/sign_out?rd=/` sofort wieder zum IdP, der ohne Passkey SSO macht.

Flow: `/oauth2/sign_out?rd=` → `https://auth.myalabor.ch/api/oidc/end-session?id_token_hint={id_token}&post_logout_redirect_uri=…`  
(`{id_token}` ersetzt oauth2-proxy v7.15+ vor dem Redirect.)

Einmalig am OIDC-Client in Pocket ID unter **Logout Callback URLs** eintragen:

`https://dashboard.myalabor.ch/`

## Smoke

1. Incognito → `https://dashboard.myalabor.ch/apps` → Redirect Login.  
2. Passkey → Katalog sichtbar.  
3. Logout → landet auf Dashboard-Login; erneuter Besuch verlangt Passkey (kein stilles SSO).  
4. `https://einkaufen.myalabor.ch/` ohne Session → Login.
