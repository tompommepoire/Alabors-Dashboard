# §4 Checkliste — Dashboard (Plattform-Tor)

**Vertrag:** [alabor-harness/docs/AUTH-HARNESS.md](https://github.com/tompommepoire/alabor-harness/blob/main/docs/AUTH-HARNESS.md) (Source of Truth — nicht hier kopieren).

App-Name: **Alabor Dashboard**  
Hostname: `dashboard.myalabor.ch`  
Owner: Tom / Haushalt myalabor  
Datum: 2026-11-16

**Rolle:** Tor / Katalog — **kein** App-Auth-Modus `inherit` / `reauth` / `choose` / `shared`. Das Dashboard *ist* das Tor (Modus: **Tor**).

### A. Tor

| Frage | Antwort |
|-------|---------|
| Erscheint im Dashboard? | n/a (ist das Dashboard) |
| Welche Konten sehen die App? | alle eingeloggten Plattform-Konten (Katalog ggf. gefiltert) |
| Direkte URL ohne Plattform-Session erlaubt? | **nein** — hinter Forward-Auth (oauth2-proxy) |
| RP-ID dieser App | n/a — Passkeys nur am Fremd-IdP `auth.myalabor.ch` (§2c) |
| CSP gesetzt (XSS-Härtung, Pflicht)? | ja — Next headers / Follow-up härten |
| Eigene WebAuthn-Ceremony? | **nein** — Pocket ID |

### B. Primärmodus

- [x] — (**Tor**) kein Primärmodus aus §3; Katalog + Gate-UX only

Begründung: Dashboard authentisiert nicht Apps und liefert keine App-Credentials. Start-Links ohne Langzeit-Pair-URLs; `inherit` erst nach Exchange/Gate in den Ziel-Apps.

### B2. Mitgliederliste

- [x] `none` — Tor selbst braucht keinen Roster-Picker

### B3. `inherit`-Übergabe

n/a (kein `inherit`).

### C. Credentials & Geräte

| Frage | Antwort |
|-------|---------|
| Eigenes Credential neben Plattform-Session? | nein — Session vom IdP/Proxy |
| Cascade Tor→App? | n/a für das Dashboard; Pflicht für `inherit`/`reauth`-Apps laut Harness |

### C2. Widerruf & Erstkey

| Frage | Antwort |
|-------|---------|
| Passkeys listen/add/remove? | **ja** — Pocket ID Self-Service; Dashboard verlinkt |
| Sessions beenden? | **ja** — Pocket ID / oauth2-proxy Sign-Out |
| Admin 1×-Erstkey? | **ja** — Pocket-ID-Invites (TTL laut IdP); Audit ohne Secret beim IdP |
| Zusätzlicher App-Invite? | nein |

### D. Fallback

| Frage | Antwort |
|-------|---------|
| Pfad ohne Dashboard? | Login direkt am IdP `auth.myalabor.ch`; Apps nur hinter Gate |
| Pair-Links im Dashboard? | **nein** (verboten) |

### E. Explizit verboten

- [x] Kein dauerhaftes Secret in Dashboard-URLs  
- [x] Kein Paste-Feld für Langzeit-Tokens  
- [x] Kein `inherit` deklarieren  
- [x] Keine eigene WebAuthn-Verifikation im Dashboard  
- [x] State-Changes nicht per GET (Logout via Proxy-Sign-Out)
