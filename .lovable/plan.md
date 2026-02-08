

# Plan: Vereinfachter Dokumenten-Upload in der Checkliste

## Problemanalyse

Der aktuelle Upload-Flow benötigt zu viele Klicks:
1. "Hochladen" Button klicken → Navigation zu neuer Seite
2. "Dokumente hochladen" Button klicken
3. Datei auswählen
4. "Hochladen" Button klicken
5. Ggf. Bestätigung
6. Zurück navigieren

**Ziel**: Upload mit 2-3 Klicks direkt aus der Checkliste

---

## Lösungsansatz: Inline-File-Input mit direktem Upload

Statt eines komplexen Bottom-Sheet-Drawers (der früher Probleme verursachte) nutzen wir einen **versteckten File-Input direkt im Checklist-Item**, der sofort den nativen Dateiauswahl-Dialog öffnet.

```text
┌─────────────────────────────────────────┐
│  Lohnausweis                    PFLICHT │
│  Dein jährlicher Lohnausweis...         │
│                                         │
│  ┌─────────────┐  ┌─────────────────┐   │
│  │ Hochladen   │  │ Aus vorhandenen │   │
│  └─────────────┘  └─────────────────┘   │
│       ↓                                 │
│  [Versteckter Input öffnet Dialog]      │
│       ↓                                 │
│  [Datei gewählt → Direkt hochladen]     │
│       ↓                                 │
│  [OCR im Hintergrund, Toast bei Erfolg] │
└─────────────────────────────────────────┘
```

### Warum dieser Ansatz?

1. **Keine Navigation** - Benutzer bleibt auf der Checkliste
2. **Keine zusätzlichen Modals** - Der native Datei-Dialog ist ausreichend
3. **Minimaler UI-Code** - Weniger kann brechen
4. **Bekannte Pattern** - `EnhancedDocumentUploader` wird wiederverwendet, aber unsichtbar

---

## Technische Umsetzung

### 1. Versteckter File-Input pro Checklist-Item

In `DocumentChecklist.tsx` wird pro Item ein versteckter `<input type="file">` hinzugefügt:

```typescript
const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

// Pro Item
<input
  type="file"
  ref={el => fileInputRefs.current[item.id] = el}
  accept="image/jpeg,image/png,application/pdf"
  onChange={(e) => handleQuickUpload(e, item)}
  className="hidden"
/>

<button onClick={() => fileInputRefs.current[item.id]?.click()}>
  Hochladen
</button>
```

### 2. Direkte Upload-Funktion

```typescript
const handleQuickUpload = async (
  event: React.ChangeEvent<HTMLInputElement>,
  item: ChecklistItem
) => {
  const file = event.target.files?.[0];
  if (!file) return;
  
  // Zeige Toast für Upload-Start
  toast({ title: "Upload läuft...", description: file.name });
  
  try {
    // Nutze EncryptedDocumentService direkt
    await encryptedDocService.uploadEncryptedDocument(
      file,
      item.id,
      userId,
      taxYear,
      item.title,
      activeTaxFilerId
    );
    
    // Erfolg
    toast({ title: "Hochgeladen", description: `${item.title} wurde hochgeladen` });
    
    // Dokumente aktualisieren
    await refreshDocuments();
    markUploaded(item.id, true);
    
  } catch (error) {
    toast({ title: "Fehler", description: error.message, variant: "destructive" });
  }
};
```

### 3. Optionale OCR-Validierung (vereinfacht)

Die OCR-Validierung läuft **im Hintergrund** ohne Blockierung:
- Bei niedriger Konfidenz: Nur eine Toast-Warnung, kein Dialog
- Dokument wird trotzdem hochgeladen

```typescript
// Nach erfolgreichem Upload (async, non-blocking)
documentValidator.validate(file, item.id).then(result => {
  if (result.needsUserConfirmation) {
    toast({
      title: "Hinweis",
      description: "Dokumenttyp konnte nicht eindeutig erkannt werden",
      variant: "default"
    });
  }
});
```

---

## Betroffene Dateien

| Datei | Änderung |
|-------|----------|
| `src/components/DocumentChecklist.tsx` | Versteckte File-Inputs + Quick-Upload-Handler |
| (optional) `src/components/documents/QuickUploadButton.tsx` | Neue Komponente für bessere Kapselung |

---

## Vorteile dieses Ansatzes

| Aspekt | Alt | Neu |
|--------|-----|-----|
| Klicks für Upload | 5-6 | **2** |
| Navigation | Ja | Nein |
| Modals/Sheets | Ja | Nein |
| Komplexität | Hoch | Niedrig |
| Fehleranfälligkeit | Hoch | Niedrig |

---

## Risikominimierung

**Warum dies stabil bleibt:**

1. **Keine komplexen State-Übergänge** zwischen Komponenten
2. **Keine Navigation** die States verlieren könnte
3. **Direkter API-Aufruf** statt Umweg über FormContext
4. **Dokumente werden sofort nach Upload neu geladen** via `refreshDocuments()`
5. **File-Input-Ref wird pro Item gespeichert** - kein Konflikt bei mehreren Items

---

## User Flow (NEU)

1. ✅ Benutzer klickt "Hochladen" → Datei-Dialog öffnet sich sofort
2. ✅ Benutzer wählt Datei → Upload startet automatisch (Toast zeigt Fortschritt)
3. ✅ Upload fertig → Item wird als "erledigt" markiert, Toast bestätigt

**Nur 2 Klicks!**

