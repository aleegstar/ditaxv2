
# Plan: Upload-Flow von Checkliste optimieren

## Ziel
Den Upload-Vorgang von 4+ Klicks und 2 Seitenwechseln auf 2 Klicks ohne Seitenwechsel reduzieren.

---

## Aktueller Flow (Problem)

| Schritt | Aktion | Typ |
|---------|--------|-----|
| 1 | "Hochladen" Button klicken | Klick |
| 2 | Seite `/form/documents/upload/{itemId}` lädt | Wartezeit |
| 3 | "Dokumente hochladen" Button klicken | Klick |
| 4 | Datei im Picker auswählen | Klick |
| 5 | "Hochladen" Button am unteren Rand klicken | Klick |
| 6 | Zurück zur Checkliste navigieren | Wartezeit |

**Ergebnis**: 4 Klicks + 2 Seitenwechsel

---

## Optimierter Flow (Lösung)

| Schritt | Aktion | Typ |
|---------|--------|-----|
| 1 | "Hochladen" Button klickt direkt den Datei-Picker | Klick |
| 2 | Datei auswählen | Klick |
| 3 | Validierung + Upload startet automatisch | Automatisch |
| 4 | Inline-Status zeigt Fortschritt | Visuell |

**Ergebnis**: 2 Klicks, kein Seitenwechsel

---

## Technische Umsetzung

### 1. Versteckten File-Input pro Checklist-Item

In `DocumentChecklist.tsx`:
- Für jedes Checklist-Item einen versteckten `<input type="file">` hinzufügen
- Der "Hochladen" Button triggert direkt `fileInputRef.current?.click()`

### 2. Inline-Upload-Logik

Neue Funktion `handleDirectUpload(itemId, files)`:
- Datei-Validierung (Grösse, Typ)
- OCR-Validierung im Hintergrund
- Verschlüsselter Upload mit Fortschritts-Anzeige
- Bei niedriger Konfidenz: Kompaktes Modal statt voller Seitennavigation

### 3. Inline-Status-Anzeige

Status direkt im Checklist-Item anzeigen:
- "Wird geprüft..." (während OCR)
- "Wird hochgeladen..." (während Upload)
- Fortschrittsbalken inline

### 4. Kompaktes Bestätigungs-Modal (nur bei niedriger Konfidenz)

Statt separater Seite: Schlankes Modal für Bestätigung wenn Konfidenz < 70%

---

## Betroffene Dateien

| Datei | Änderungen |
|-------|------------|
| `src/components/DocumentChecklist.tsx` | Versteckte File-Inputs, `handleDirectUpload`, Inline-Status |
| `src/components/documents/InlineUploadHandler.tsx` | **Neu**: Kompakte Upload-Logik ohne Seitennavigation |
| `src/components/ui/modern-upload-dialog.tsx` | Optional: Minimales Modal für niedrige Konfidenz |

---

## UI-Änderungen im Detail

### Vorher (Button in Checkliste)
```
[CloudUpload Icon] Hochladen → navigiert zu /form/documents/upload/{id}
```

### Nachher (Button in Checkliste)
```
[CloudUpload Icon] Hochladen → öffnet direkt nativen Datei-Picker
```

### Inline-Status während Upload
```
[Spinner] Wird hochgeladen... 45%
```

### Bei niedriger Konfidenz (Modal)
```
┌──────────────────────────────────────┐
│ Dokument nicht eindeutig erkannt     │
│                                      │
│ [Trotzdem einreichen] [Andere Datei] │
└──────────────────────────────────────┘
```

---

## Erwartetes Ergebnis

- Upload in **2 Klicks** statt 4+
- **Kein Seitenwechsel** - alles inline in der Checkliste
- Schnelleres Gefühl durch sofortige Reaktion
- Gleiche Sicherheit: OCR-Validierung + Verschlüsselung bleibt erhalten
