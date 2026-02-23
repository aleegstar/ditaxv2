

## Signatur-Dialog als Bottom Sheet umgestalten

### Ziel
Den Signatur-Dialog von einem zentrierten Modal zu einem modernen Bottom Sheet umbauen. Der Ton wird freundlicher und weniger juristisch -- es geht darum, dass der User bestaetigt: "Ja, diese Steuererklaerung darf eingereicht werden."

### Aenderungen

**Datei: `src/components/signature/SignatureDialog.tsx`**

1. **Dialog zu Drawer umbauen**
   - `Dialog`/`DialogContent` ersetzen durch `Drawer`/`DrawerContent` (variant="bottom-sheet")
   - Drawer-Komponente aus `@/components/ui/drawer` importieren
   - Kein manueller X-Button mehr noetig (Drawer hat Drag-Handle)

2. **Inhalt vereinfachen und freundlicher gestalten**
   - Header: Icon (Send/FileCheck) + "Steuererklaerung einreichen" statt "unterschreiben"
   - Untertitel: "Steuerjahr 2025" -- schlicht und klar
   - PDF-Vorschau-Button bleibt (Datei ansehen)
   - Den langen Vollmacht-Text und die Shield-Box komplett entfernen
   - Die zwei separaten Checkboxen (Vollmacht + Verantwortung) zu einer einzigen zusammenfassen:
     "Ich habe meine Steuererklaerung geprueft und bin einverstanden, dass diese ueber Ditax eingereicht wird."
   - Das Signatur-Namensfeld bleibt als Bestaetigung (Name eintippen)
   - Der rechtliche Langtext (`authorizationText`) wird weiterhin im Hintergrund an die Edge Function gesendet -- er wird nur nicht mehr angezeigt

3. **Button-Layout (Bottom-Sheet-Standard)**
   - Primaer-Button oben: "Einreichen" (blau, pill-shaped, mit Send-Icon)
   - Sekundaer-Button unten: "Abbrechen" (weiss/grau, pill-shaped)
   - Kleiner Hinweistext darunter bleibt

4. **Erfolgs-Ansicht**
   - Bleibt gleich (CheckCircle + "Erfolgreich eingereicht")

### Technische Details

- Import aendern: `Drawer, DrawerContent, DrawerTitle` statt `Dialog, DialogContent, DialogTitle`
- `open`/`onOpenChange` Props bleiben identisch (Drawer unterstuetzt dieselbe API)
- `handleSign`-Logik bleibt komplett unveraendert (authorizationText wird weiterhin mitgesendet)
- Nur eine Checkbox statt zwei -> `responsibilityAccepted` State entfaellt, nur `authorizationAccepted` bleibt
- Validierung: `authorizationAccepted && signatureName matches fullName`

