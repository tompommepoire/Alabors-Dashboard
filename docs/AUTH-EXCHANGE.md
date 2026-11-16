# Exchange / `inherit`-Übergabe — später (Tor-4)

**Status:** bewusst **nicht** parallel zum Gate.  
**Vertrag:** [AUTH-HARNESS.md §3b](https://github.com/tompommepoire/alabor-harness/blob/main/docs/AUTH-HARNESS.md) — Source of Truth.

## Wann

Erst wenn Pocket ID + oauth2-proxy vor Dashboard und Apps stabil sind und Konto-Identität (`sub`/E-Mail) zuverlässig am Upstream ankommt.

## Was

Für Apps mit Soll-Modus `inherit` (apple-anki, mininotes, …) einen der erlaubten Mechanismen live schalten:

| Code | Kurz |
|------|------|
| `session-cookie` | Gate-Session reicht der App (Audience/Prüfung) |
| `exchange` | `POST …/exchange` → einmaliges App-Ticket mit `aud` |
| `handoff-once` | Kurzcode aus Dashboard → App löst Credential ein |

Bis **Ist ≠ `none`**: Katalog zeigt Hinweis; **keine** Langzeit-Pair-URL im Dashboard.

## Was wir jetzt nicht bauen

- Roster-API (`choose` + `platform-scoped`) — nur wenn eine App sie braucht
- Passwort/2FA am IdP — Pocket-ID-Roadmap / später
- Cascade-Webhooks Tor→App — zusammen mit Exchange

## Checkliste vor Soft-Launch `inherit`

1. Gate-Session gültig und Subject stabil.  
2. Endpoint + TTL + Einmalnutzung + `aud`-Binding.  
3. App prüft `aud`; speichert nur host-only Credential.  
4. Katalog: `handoff` von `none` → live Mechanismus; Pair nur §4.D Fallback außerhalb Dashboard.
