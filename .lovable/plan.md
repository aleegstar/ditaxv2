

# Fix: "Dokument trotzdem einreichen" funktioniert nicht auf Mobile

## Problem

Das Vaul-Drawer-Komponente auf Mobile erlaubt standardmassig das Schliessen durch Wisch-Gesten (drag-to-dismiss). Wenn der Nutzer auf den Button "Dokument trotzdem einreichen" tippt, kann Folgendes passieren:

1. Eine minimale Fingerbewegung beim Tippen wird als Wisch-Geste interpretiert
2. Die `onOpenChange(false)` wird ausgelost, welche `handleOcrClose` aufruft
3. `handleOcrClose` setzt `pendingUploadFile` und `pendingUploadItem` auf `null`
4. Wenn der Button-Click danach feuert, findet `handleOcrConfirm` keine Daten mehr und bricht ab

Zusatzlich kann auf mobilen Geraten die Overlay-Ebene des Drawers Touch-Events abfangen, bevor sie den Button erreichen.

## Losung

### 1. Drawer nicht durch Wischen schliessbar machen in der "result"-Phase

Wenn `ocrPhase === 'result'` ist, soll der Drawer nicht durch Wischen oder Overlay-Klick geschlossen werden konnen. Nur die expliziten Buttons sollen den Drawer schliessen.

In `DocumentChecklist.tsx`:
- `dismissible={false}` zum Drawer hinzufugen wenn `ocrPhase === 'result'`
- Das verhindert, dass Touch-Gesten die pending Daten loschen

### 2. handleOcrConfirm robuster machen

Falls `pendingUploadFile` oder `pendingUploadItem` trotzdem `null` sein sollten, eine Fehlermeldung anzeigen statt stillschweigend abzubrechen.

## Technische Details

### Datei: `src/components/DocumentChecklist.tsx`

**Aenderung 1 - Drawer Props:**
```typescript
// Vorher:
<Drawer open={ocrDrawerOpen} onOpenChange={(open) => { if (!open) handleOcrClose(); }}>

// Nachher:
<Drawer 
  open={ocrDrawerOpen} 
  onOpenChange={(open) => { if (!open) handleOcrClose(); }}
  dismissible={ocrPhase !== 'result'}
>
```

**Aenderung 2 - handleOcrConfirm mit Fehlermeldung:**
```typescript
const handleOcrConfirm = async () => {
  if (pendingUploadFile && pendingUploadItem) {
    try {
      await executeUpload(pendingUploadFile, pendingUploadItem);
    } catch (error) {
      console.error('[handleOcrConfirm] executeUpload failed:', error);
    } finally {
      setOcrDrawerOpen(false);
      setPendingUploadFile(null);
      setPendingUploadItem(null);
      setValidationResult(null);
      setOcrPhase('validating');
    }
  } else {
    console.warn('[handleOcrConfirm] Missing pending data');
    toast({
      title: 'Upload fehlgeschlagen',
      description: 'Bitte versuche es erneut.',
      variant: 'destructive'
    });
    setOcrDrawerOpen(false);
    setPendingUploadFile(null);
    setPendingUploadItem(null);
  }
};
```

## Erwartetes Ergebnis

- In der Ergebnis-Phase kann der Drawer nicht versehentlich per Wisch-Geste geschlossen werden
- Der Button "Dokument trotzdem einreichen" funktioniert zuverlassig auf Mobile
- Falls Daten dennoch fehlen, sieht der Nutzer eine klare Fehlermeldung

