# Mini-PRD: Alabor Dashboard

**Produkt:** `dashboard.myalabor.ch`  
**Typ:** private Web-App (App-Launcher)  
**Status:** Entwurf v0.3 — Entscheidungen geschlossen

---

## 1. Problem

Mehrere selbst entwickelte Apps (Haushalt + Solo) liegen verteilt auf Pi, EliteBook und geplanten Subdomains. Es fehlt ein zentraler, geschützter Einstieg zum Finden und Starten.

## 2. Ziel

Sichere Landing-Page unter `dashboard.myalabor.ch`: nach Passkey-Login sehen berechtigte Nutzer ihren App-Katalog und starten Apps mit einem Klick.

## 3. Entscheidungen (geschlossen)

| Frage | Entscheidung |
|-------|----------------|
| Nutzer | **Mehrere User** (Haushalt / Familie) |
| Hosting | **Raspberry Pi** (bestehender always-on Host, Cloudflare-Tunnel) |
| Erster Passkey | **Setup-Token** (einmalig / admin-ausgestellt) |
| App-Hosts | Ja — `*.myalabor.ch` bzw. bestehende LAN/Tunnel-URLs |
| MVP-Apps | **Einkaufsliste**, **Lumito**, **Car-App (AlaborsCar / eDrive)** |
| Setup-Token UI | **Settings-UI** (Admin), nicht nur CLI |
| LAN-only Apps | **Ja im Katalog** (mit Kennzeichnung; Link kann außerhalb LAN fehlschlagen) |

## 4. Nicht-Ziele (v1)

- Kein App-Hosting / keine Container-Orchestrierung im Dashboard
- Kein öffentliches Sign-up / kein Self-Service ohne Token
- Kein SSO in die Ziel-Apps (Apps behalten eigene Auth: Token-URL, Login, …)
- Kein Admin-UI für App-Katalog (Config-Datei)
- Keine feingranulare Rechte-Matrix pro App (optional später: `visibleTo`)

## 5. Nutzer

| Persona | Beschreibung |
|---------|--------------|
| Admin | Legt User an (Setup-Token), widerruft Passkeys, pflegt Katalog |
| Member | Login per Passkey, sieht freigegebene Apps, startet sie |

Typisch: 2–N Haushaltsmitglieder, je 1–mehrere Geräte.

## 6. Kern-User-Stories

1. **Login:** Als Member öffne ich `dashboard.myalabor.ch` und authentifiziere mich per Fingerprint/Face/PIN (Passkey).
2. **Launcher:** Nach Login sehe ich die freigegebenen Apps und starte eine per Klick (neuer Tab).
3. **Onboarding:** Als neuer User öffne ich `/register?token=…` (Setup-Token vom Admin), wähle Anzeigename, registriere Passkey.
4. **Mehrere Geräte:** Mit Session oder neuem Setup-Token registriere ich ein weiteres Gerät.
5. **Sicherheit:** Ohne Session kein Katalog, keine App-URLs.
6. **Logout:** Session ablaufen lassen oder manuell beenden.

## 7. Anforderungen

### Funktional

| ID | Anforderung | Prio |
|----|-------------|------|
| F1 | Geschützter App-Katalog nach Login | P0 |
| F2 | Klick öffnet App-URL (neuer Tab) | P0 |
| F3 | Auth nur via WebAuthn / Passkey | P0 |
| F4 | Multi-User: User-Datensatz + Credentials gebunden an `user_id` | P0 |
| F5 | Registrierung nur mit gültigem Setup-Token | P0 |
| F6 | Admin stellt Setup-Token in **Settings-UI** aus / invalidiert sie | P0 |
| F7 | Session-Timeout + Logout | P1 |
| F8 | Passkeys auflisten / widerrufen (pro User) | P1 |
| F9 | LAN-only Apps im Katalog mit Badge „Nur Heimnetz“ | P0 |
| F10 | Optional: App nur für bestimmte User sichtbar | P2 |
| F11 | Optional: Health-Badge / Erreichbarkeit pro App | P2 |

### Nicht-funktional

| ID | Anforderung | Prio |
|----|-------------|------|
| N1 | Läuft auf Raspberry Pi (ARM), schlanker Runtime-Footprint | P0 |
| N2 | Öffentlich nur über bestehenden Cloudflare-Tunnel + HTTPS | P0 |
| N3 | HttpOnly + Secure + SameSite Session-Cookie | P0 |
| N4 | Keine Secrets im Frontend-Bundle | P0 |
| N5 | CSP, HSTS (via CF/Proxy), Rate-Limit auf Auth-Endpoints | P1 |
| N6 | Mobile-first | P1 |

## 8. Authentifizierung

**WebAuthn / Passkeys** (Platform-Authenticator = Fingerprint o.ä.).

**Setup-Token-Flow (Onboarding):**

1. Admin erzeugt Token (hoch-entropisch, nur Hash in DB, TTL, max. 1 Nutzung oder N Geräte).
2. User öffnet Link `https://dashboard.myalabor.ch/register?token=…`.
3. Anzeigename + `navigator.credentials.create()` → Credential an User gebunden.
4. Token wird verbraucht; Session optional sofort gesetzt.

Kein Passwort. Kein öffentliches Register ohne Token.

## 9. App-Katalog

Konfig-Datei `apps.config.ts`. Dashboard **startet** Apps (Link), hostet sie nicht.

### MVP (Ship)

| id | Name | Quelle | URL (Stand) | Reichweite |
|----|------|--------|-------------|------------|
| `einkaufsliste` | Einkaufsliste | `Einkaufsliste` | Token-URL via Env (Pi / myalabor.ch) | öffentlich sobald am Tunnel |
| `lumito` | Lumito IPTV | `Lumito_iptv` | z. B. `http://192.168.1.172:8080/…` | **LAN-only** |
| `alabors-drive` | Car-App / eDrive | `AlaborsCar` | `https://auto.myalabor.ch/web/drive.html` | öffentlich (CF-Tunnel) |

LAN-only Einträge erscheinen trotzdem im Katalog, mit klarer Kennzeichnung („Nur Heimnetz“). Außerhalb des LANs darf der Klick fehlschlagen — kein VPN-Zwang in v1.

Token-URLs (Einkaufsliste) nur über Env + auth’ed API, nie im Git.

### Später (nicht MVP)

Anki (`anki-lern.myalabor.ch`), Server Manager, Voicemail, Rad Planner, Podcast, …

## 10. Erfolgskriterien

- ≥2 User mit je ≥1 Passkey können sich einloggen
- Admin erzeugt Setup-Token in Settings-UI; Onboarding damit funktioniert
- Alle drei MVP-Apps im Katalog; Drive und (wenn deployed) Einkaufsliste startbar
- LAN-Badge an Lumito sichtbar
- Deploy auf Pi + Ingress `dashboard.myalabor.ch` am Cloudflare-Tunnel
- Ohne Auth kein Katalog-Leak

## 11. Offene Restpunkte

Keine blockernden Fragen mehr. Feintuning beim Implementieren: genaue Lumito-Open-URL, Einkaufsliste-Host sobald Tunnel-Regel steht.
