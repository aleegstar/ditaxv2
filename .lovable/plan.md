## Ziel
Die Admin-Bereiche sollen zuverlässig laden, ohne manuelles Refreshing oder leere Zustände nach der Navigation.

## Was ich umsetzen werde
1. **Admin-Auth-Readiness zentralisieren**
   - Einen kleinen, zentralen Auth-Readiness-Mechanismus für Admin-Seiten einführen.
   - Admin-Daten erst laden, wenn die Supabase-Session wirklich wiederhergestellt ist und der User vorhanden ist.
   - Verhindern, dass Admin-Komponenten beim ersten Mount schon Queries abschicken.

2. **Doppelte / konkurrierende Admin-Prüfungen entfernen**
   - `AdminRouteGuard`, `src/pages/Admin.tsx` und `src/components/admin/AdminDashboard.tsx` auf eine saubere Reihenfolge bringen:
     - zuerst Auth bereit
     - dann Admin-Rolle bestätigt
     - erst danach Daten laden
   - Das aktuelle Muster mit mehrfachen `getUser()` / `verifyAdminAccess()` / Direkt-Queries beim Mount entschärfen.

3. **Admin-Seiten gegen leere Zustände absichern**
   - In den Hauptseiten (`/admin`, `/admin/dashboard`, `/admin/users`, `/admin/tax-processing`) Queries nur noch starten, wenn Auth/Admin bereit ist.
   - Währenddessen klare Loading-States statt „nichts erscheint“.
   - Refresh-Buttons nur als manuelle Aktualisierung verwenden, nicht als Workaround für Initial-Loads.

4. **Navigation stabilisieren**
   - Prüfen und bereinigen, dass interne Admin-Navigation nicht in einen Zustand wechselt, in dem die Route da ist, aber die Session/Role-Prüfung noch nicht fertig ist.
   - Falls nötig, Admin-Layout-Komponenten wie Sidebar/Header ebenfalls auf denselben Readiness-State hängen.

5. **Gezielte Fehlerdiagnose verbessern**
   - Präzisere Logs/Fehlerzustände für diese Fälle ergänzen:
     - Session noch nicht bereit
     - User vorhanden, aber Admin-Rolle fehlt
     - Query durch RLS blockiert
   - So lässt sich unterscheiden, ob es ein Race Condition- oder Rollenproblem ist.

## Konkrete Erkenntnisse aus dem Code
- `src/pages/Admin.tsx` lädt Benutzerdaten direkt in `useEffect(..., [])` und prüft dort Auth/Admin nochmal separat.
- `src/components/admin/AdminDashboard.tsx` lädt Stats ebenfalls sofort beim Mount, ohne auf bestätigte Admin-Readiness zu warten.
- `AdminRouteGuard` prüft Admin bereits vorher, aber die Seiten führen danach trotzdem nochmals eigene Auth-/Admin-Checks und Direkt-Queries aus.
- Das ist ein typisches Muster für inkonsistente Initialisierung und erklärt gut, warum nach Navigation manchmal erst ein Refresh hilft.

## Technische Umsetzung
- Neue Admin-Readiness-Hook oder vorhandene Auth-Schicht erweitern.
- Admin-Komponenten nur mit Guard-abhängigem `enabled`-Verhalten laden.
- `Admin.tsx` als Container vereinfachen: keine parallele zweite Auth-Orchestrierung mehr.
- `AdminDashboard.tsx` und weitere Kernseiten auf denselben Freigabezustand umstellen.

## Hinweis
Ich konnte den angegebenen Account `sandrograber.ch@gmail.com` nicht live gegen die Datenbank prüfen, weil in dieser Session kein direkter DB-Zugriff verfügbar ist. Der Fix zielt deshalb zuerst auf das klar sichtbare Frontend/Auth-Race; falls danach weiterhin nur dieser Account betroffen ist, wäre als Nächstes die Admin-Rolle des Accounts zu verifizieren.