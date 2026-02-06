
# Plan: Dokumenten-Upload in der Checkliste vereinfachen

## Analyse des Problems

Der aktuelle Upload-Flow benötigt zu viele Klicks:

| Aktueller Flow | Klicks |
|----------------|--------|
| 1. "Hochladen" Button klicken | 1 |
| 2. Seite lädt, auf Upload-Button klicken | 2 |
| 3. Datei auswählen | 3 |
| 4. "Dokument einreichen" klicken | 4 |
| 5. Automatische Rückleitung | - |
| **Gesamt** | **4 Klicks** |

---

## Lösungsvorschlag: Direkter Inline-Upload

Statt zu einer separaten Seite zu navigieren, soll der "Hochladen"-Button **sofort die Dateiauswahl öffnen** und der Upload **direkt in der Checkliste** stattfinden.

| Neuer Flow | Klicks |
|------------|--------|
| 1. "Hochladen" Button klicken → Dateiauswahl öffnet sich | 1 |
| 2. Datei auswählen → Upload startet automatisch | - |
| **Gesamt** | **1 Klick** |

---

## Technische Umsetzung

### Datei: `src/components/DocumentChecklist.tsx`

1. **Hidden File Input pro Item hinzufügen**
   - Statt Navigation zur Upload-Seite wird ein verstecktes `<input type="file">` getriggert

2. **Neuer Upload-Handler inline**
   - Nutzt den bestehenden `EncryptedDocumentService` für den Upload
   - Zeigt einen kleinen Spinner/Progress im jeweiligen Checklist-Item
   - Bei Erfolg: Item wird als "uploaded" markiert, Dokumente werden refreshed

3. **Bestehender InlineDocumentUploader als Fallback**
   - Falls OCR-Validierung fehlschlägt (Konfidenz < 70%), kann optional ein Modal gezeigt werden

### Ablauf im Code:

```text
[Hochladen Button]
       │
       ▼
[Hidden <input type="file">].click()
       │
       ▼
[Datei ausgewählt]
       │
       ▼
[Spinner im Item anzeigen]
       │
       ▼
[OCR-Validierung (optional)]
       │
       ├── Konfidenz >= 70% ──▶ [Upload via EncryptedDocumentService]
       │                              │
       │                              ▼
       │                        [Erfolg → refresh + markUploaded]
       │
       └── Konfidenz < 70% ──▶ [Upload trotzdem durchführen]
                                      │
                                      ▼
                                [Erfolg → refresh + markUploaded]
```

---

## Betroffene Dateien

| Datei | Änderung |
|-------|----------|
| `src/components/DocumentChecklist.tsx` | Hidden file inputs, inline Upload-Handler, Progress-States |

---

## Was NICHT geändert wird

- Upload-Logik (funktioniert einwandfrei laut Anforderung)
- `EncryptedDocumentService` bleibt unverändert
- `EnhancedDocumentUploader` bleibt als Fallback für komplexe Szenarien
- OCR-Validierung bleibt wie sie ist

---

## Erwartetes Ergebnis

- **1-Klick-Upload**: Benutzer klickt "Hochladen" → Dateiauswahl öffnet sich sofort
- **Kein Seitenwechsel**: Alles passiert inline in der Checkliste
- **Visuelles Feedback**: Spinner/Progress während des Uploads direkt im Item
- **Nahtlose Experience**: Nach erfolgreichem Upload aktualisiert sich die Checkliste automatisch
