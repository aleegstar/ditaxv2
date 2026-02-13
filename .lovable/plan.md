

# Fix: Unverschlüsselten Upload-Pfad in DocumentUploader entfernen

## Problem
`DocumentUploader.tsx` enthält einen Toggle-Schalter, der Benutzern erlaubt, die Verschlüsselung zu deaktivieren. Der `else`-Zweig (Zeile 163-230) lädt Steuerdokumente dann **unverschlüsselt** direkt in Supabase Storage hoch. Das ist ein Sicherheitsrisiko.

Alle anderen Dokument-Upload-Komponenten (`DocumentUploadSheet`, `Documents.tsx`, `EnhancedDocumentUploader`, `InlineDocumentUploader`) nutzen bereits ausschliesslich `uploadEncryptedDocument`.

Andere Upload-Typen (Avatare, Chat-Anhaenge, Support-Tickets, Admin-Steuerrechnungen) sind korrekt unverschluesselt -- das sind keine sensiblen Steuerdokumente bzw. werden serverseitig verarbeitet.

## Loesung

### Datei: `src/components/DocumentUploader.tsx`

1. **`encryptionEnabled`-State und Toggle-UI entfernen** -- Verschluesselung ist immer aktiv, kein Opt-out.

2. **`else`-Zweig (unverschluesselter Upload) entfernen** -- Nur der verschluesselte Pfad via `uploadEncryptedDocument` bleibt bestehen.

3. **UI-Elemente bereinigen**: Den Switch/Toggle, Labels und bedingte Texte fuer "Standard-Upload" entfernen.

### Aenderungsumfang
- 1 Datei (`DocumentUploader.tsx`)
- State-Variable `encryptionEnabled` und `setEncryptionEnabled` entfernen
- `if (encryptionEnabled)` Bedingung entfernen, nur den verschluesselten Pfad behalten
- Toggle-Switch UI (Zeilen ~318-340) entfernen
- Bedingte Texte vereinfachen (immer verschluesselt)

