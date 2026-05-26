## Ziel

Native Despia Action Sheets (`actionsheet://`) statt Web-Sheets verwenden, wo es UX-Wert bringt. Web-Fallback (bestehende Komponenten) bleibt für Browser/Desktop unverändert.

## Helper in `src/lib/despia.ts`

Neuer typisierter Wrapper + globaler Multiplexer (analog `vision://`-Pattern), damit mehrere Call-Sites parallel funktionieren — auch wenn Despia nur einen globalen `window.onSheetEvent` kennt.

```ts
export type ActionSheetItem = {
  label: string;
  value: string;
  iconIos?: string;       // SF Symbol
  iconAndroid?: string;   // Material drawable
  destructive?: boolean;
};

export function despiaActionSheet(opts: {
  title?: string;
  items: ActionSheetItem[];
  theme?: 'light' | 'dark' | 'system';
}): Promise<string | null>; // resolved value oder null bei dismiss
```

Intern: aktueller Pending-Resolver wird in einer Modulvariable gehalten, `window.onSheetEvent` wird einmalig installiert und ruft den aktiven Resolver auf (vorhandene Handler werden vorher als `prev` aufgerufen, danach reset auf `null`).

## Einsatzorte (Phase 1 — UX-Gewinn klar)

1. **`src/components/documents/UploadActionSheet.tsx`** — Upload-Auswahl (Foto / Scan / Datei)
   - In Despia-Umgebung `despiaActionSheet({ title: 'Dokument hinzufügen', items: [photo, scan, file] })` aufrufen statt das eigene Bottom-Sheet zu öffnen.
   - Icons: `photo`/`photo_library`, `doc.text.viewfinder`/`document_scanner`, `folder`/`folder_open`.
   - Aufrufer (`FloatingUploadButton` o. ä.) bleibt identisch — Komponente bekommt ein `useEffect`, das bei `open && isDespiaNative()` direkt `despiaActionSheet` triggert, das Web-Sheet überspringt, und je nach Antwort `onPhoto/onScan/onFile/onClose` aufruft.

2. **Dokument-Aktionen in `Documents.tsx` / `DocumentViewer.tsx`** — pro Dokument „Umbenennen / Teilen / Löschen" (Löschen `destructive: true`).
   - Aktuell vermutlich Dropdown/Dialog — bei `isDespiaNative()` zuerst Action Sheet, bei Web bisheriges Verhalten.
   - Genauen Aufrufpunkt beim Implementieren prüfen; falls dort heute nur ein Lösch-Confirm existiert, lassen wir Phase 1 nur bei Upload.

## Was nicht geändert wird

- Web/Desktop UX (bestehende Bottom-Sheets, Dropdowns, Dialoge bleiben).
- `AppBottomSheet`, `AppDialog` Standardkomponenten — Action Sheet ist additiv für native.
- iOS-only-Logik — Despia rendert sowohl auf iOS als auch Android native.

## Hinweise

- Native Rebuild im Despia-Dashboard nötig (Feature-Flag im Build).
- Items immer als JSON-String in URL-Param; `URLSearchParams` übernimmt Encoding.
- `theme` lassen wir auf default (`system`), passt zu Ditax Light-Mode.
- Wenn `onSheetEvent` nie feuert (alte App-Version), nach 15s Timeout `null` resolven und auf Web-Fallback umschalten.
