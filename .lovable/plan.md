# Plan: Offline-Probleme sauber beheben

## Problem
Die Offline-Queue speichert nur Schreibvorgänge. Mehrere wichtige Lese-Flows laden aber weiterhin direkt aus Supabase und werfen bei fehlender Verbindung Fehl-Toasts wie:
- „Fehler beim Laden der Steuerdaten“
- „Benachrichtigungen konnten nicht geladen werden“

Dadurch wirkt die App trotz Offline-Banner kaputt, obwohl ein Teil der Daten lokal vorliegen könnte.

## Was ich ändern werde

1. **Offline-Reads auf lokalen Fallback umbauen**
   - `use-tax-year-data.ts`: letzten erfolgreichen Stand lokal behalten und bei Offline sofort daraus rendern statt Fehler zu werfen.
   - `useNotifications.ts`: Notifications bei Offline aus lokalem Cache laden und keine destruktiven Toaster zeigen.
   - `Documents.tsx`: Dokumentliste bei Offline nicht als Fehler behandeln, sondern mit letztem bekannten Stand bzw. leerem lokalen Zustand arbeiten.

2. **Read-Caching an die bestehende Offline-Architektur anbinden**
   - Bestehenden Persist-Mechanismus (`reactQueryPersist.ts`) wirklich für diese Daten nutzen oder einen kleinen stabilen IndexedDB-Fallback ergänzen, wo heute noch direkte Supabase-Reads laufen.
   - Nur Metadaten cachen, keine sensiblen/dechiffrierten Inhalte.

3. **Offline-UX korrigieren**
   - Offline darf keine roten Fehl-Toasts mehr auslösen, wenn nur das Netzwerk fehlt.
   - Stattdessen: stiller Fallback auf Cache + bestehendes Offline-Banner + Queue-Status.
   - Reconnect soll automatisch refetchen und den lokalen Stand aktualisieren.

4. **Fehlergrenzen präzisieren**
   - Echte Backend-/RLS-/Schema-Fehler weiter sichtbar lassen.
   - Nur reine Netzwerk-/Offline-Fehler unterdrücken.

## Betroffene Dateien
- `src/hooks/use-tax-year-data.ts`
- `src/hooks/useNotifications.ts`
- `src/pages/Documents.tsx`
- `src/hooks/useProfile.ts`
- `src/lib/reactQueryPersist.ts`
- ggf. kleiner neuer Helper für persistente Read-Snapshots

## Akzeptanzkriterien
- Im Flugmodus erscheinen keine roten Toaster mehr für Steuerdaten/Benachrichtigungen.
- Dokumente-Seite bleibt benutzbar und zeigt mindestens den letzten bekannten Stand.
- Nach Wiederverbindung werden Daten automatisch neu geladen.
- Bestehende Offline-Queue für Uploads bleibt unverändert.

## Technische Notiz
Der Kernfehler ist aktuell nicht die Write-Queue, sondern dass mehrere Read-Hooks den Persist-Cache umgehen und Offline weiterhin wie einen harten Fehler behandeln.