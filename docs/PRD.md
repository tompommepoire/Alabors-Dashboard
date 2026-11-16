# Mini-PRD: Alabor Dashboard

**Produkt:** `dashboard.myalabor.ch`  
**Typ:** privater App-Launcher (Plattform-Tor / Katalog)  
**Status:** v0.4 — Auth an Harness §2c ausgerichtet  
**Vertrag:** [AUTH-HARNESS.md](https://github.com/tompommepoire/alabor-harness/blob/main/docs/AUTH-HARNESS.md)

---

## 1. Problem

Mehrere Apps liegen verteilt. Es braucht einen zentralen, geschützten Einstieg — ohne dass jede App eigene Passkey-Auth baut und ohne Secrets in Start-URLs.

## 2. Ziel

Landing unter `dashboard.myalabor.ch`: nach Anmeldung am **Fremd-IdP** (Pocket ID) sehen berechtigte Konten ihren App-Katalog und starten Apps hinter dem Gate.

## 3. Entscheidungen (geschlossen)

| Frage | Entscheidung |
|-------|----------------|
| Nutzer | Mehrere Konten (Haushalt) |
| Hosting | Raspberry Pi + Cloudflare Tunnel |
| Auth | **Pocket ID** + **oauth2-proxy** (Harness §2c) |
| Erstkey | Pocket-ID-Invites (Admin), kein Self-Signup |
| Dashboard-Rolle | **Tor / Katalog** — kein `inherit` |
| App-Start | Links ohne Langzeit-Pair-URLs |
| MVP-Apps | Einkaufen, Lumito, Car-App (+ Anki/Notes katalogisiert) |
| Sichtbarkeit | Pro Konto (`APP_GRANTS`) |

## 4. Nicht-Ziele

- Kein App-Hosting / Orchestrierung im Dashboard
- Keine eigenen Passkey-Verifier / WebAuthn-Ceremonies im Dashboard
- Kein SSO-`inherit` ohne Exchange (siehe [AUTH-EXCHANGE.md](./AUTH-EXCHANGE.md))
- Kein zweites Invite-System parallel zu Pocket ID
- Keine Pair-Tokens in Dashboard-URLs

## 5. Nutzer

| Persona | Beschreibung |
|---------|--------------|
| Admin | Pocket-ID-Invites, App-Grants pflegen (Config), Katalog |
| Member | Login am IdP, gefilterter Katalog, Apps starten; Passkeys/Sessions in Pocket ID |

## 6. Kern-User-Stories

1. **Login:** Öffne Dashboard → Gate leitet zu Pocket ID (Passkey) → zurück zum Katalog.
2. **Launcher:** Sehe freigegebene Apps; Klick öffnet Start-URL (neuer Tab) ohne Token in der URL.
3. **Onboarding:** Admin lädt per Pocket-ID-Invite ein; Empfänger registriert Passkey am IdP.
4. **Geräte:** Passkeys/Sessions unter Pocket ID (Dashboard verlinkt „Sicherheit“).
5. **Ehrlich `inherit`:** Apps mit `handoff: none` sind als „noch koppeln / Gate only“ gekennzeichnet.
6. **Logout:** Sign-Out über Proxy/IdP.

## 7. Anforderungen

| ID | Anforderung | Prio |
|----|-------------|------|
| F1 | Katalog nur hinter gültiger Gate-Session | P0 |
| F2 | Klick öffnet App-URL ohne Pair-/Langzeit-Token | P0 |
| F3 | Auth via Pocket ID (Passkey); Dashboard verifiziert nicht selbst WebAuthn | P0 |
| F4 | App-Sichtbarkeit pro Konto | P0 |
| F5 | Security-UI = Links zu IdP (Passkeys, Sessions, Admin-Invites) | P0 |
| F6 | Auth-Modus + Handoff-Status im Katalog sichtbar wo relevant | P1 |
| F7 | LAN-Badge für Heimnetz-Apps | P0 |
| F8 | Exchange/`inherit`-Übergabe | P2 (später) |

| ID | Nicht-funktional | Prio |
|----|------------------|------|
| N1 | Läuft auf Pi (ARM), schlank | P0 |
| N2 | Öffentlich nur Tunnel + HTTPS | P0 |
| N3 | Secrets nicht im Frontend-Bundle | P0 |
| N4 | Mobile-first | P1 |

## 8. Authentifizierung

Schicht A laut Harness: Pocket ID (RP = `auth.myalabor.ch`) + Forward-Auth. Dashboard konsumiert Proxy-Identity-Headers.

## 9. App-Katalog

Config + Env. Dashboard startet Apps (Link), hostet sie nicht. Token-URLs für Legacy nur Env — Ziel: Gate ersetzt Token-in-URL.

| id | Primärmodus (Ziel) | Handoff Ist |
|----|--------------------|-------------|
| einkaufsliste | `shared` | Gate |
| lumito | `choose` + `app-local` | Gate |
| alabors-drive | `shared` | Gate |
| apple-anki | Soll `inherit` | `none` |
| mininotes | Soll `inherit` | `none` |

## 10. Erfolgskriterien

- Login nur über Pocket ID; Dashboard ohne eigene Passkey-DB
- ≥2 Konten, gefilterter Katalog
- Keine Pair-Tokens in Start-Links
- Apps hinter oauth2-proxy unerreichbar ohne Session
- §4-Checkliste Tor ausgefüllt ([AUTH-CHECKLIST.md](./AUTH-CHECKLIST.md))
