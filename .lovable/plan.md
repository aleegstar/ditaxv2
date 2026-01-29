# Multi-Personen-Steuererklärungen - Implementierungsplan

## Status: Phase 5 abgeschlossen ✅

## Übersicht

Das System unterstützt nun mehrere Steuerpflichtige (Personen) pro Benutzerkonto. Ein Elternteil kann Steuererklärungen für sich selbst, Ehepartner und Kinder erstellen - alles unter einem Account.

```text
+------------------+       +------------------+       +------------------+
|      User        | 1:n   |   Tax Filer      | 1:n   |   Tax Return     |
|   (Account)      |------>|   (Person)       |------>|   (2023, 2024)   |
+------------------+       +------------------+       +------------------+
                           |  - Max Muster    |
                           |  - Anna (Kind)   |
                           |  - Leo (Kind)    |
                           +------------------+
```

---

## Abgeschlossene Phasen

### Phase 1 & 2: Datenbank ✅
- `tax_filers` Tabelle erstellt mit RLS-Policies
- Bestehende Tabellen um `tax_filer_id` erweitert
- Migration für bestehende User zu Tax Filern durchgeführt
- Automatische Trigger für neue Benutzer implementiert

### Phase 3: TaxFilerContext ✅
- `TaxFilerContext.tsx` erstellt mit vollständiger CRUD-Funktionalität
- `TaxFilerSelector.tsx` Komponente für Personenwechsel
- Integration in `App.tsx`

### Phase 4: Personen-Verwaltungsseite ✅
- `/tax-filers` Route mit Verwaltungsoberfläche
- Hinzufügen, Bearbeiten, Löschen von Personen
- i18n-Unterstützung für DE/EN

### Phase 5: FormContext-Integration ✅
Alle Queries filtern jetzt nach `tax_filer_id`:
- ✅ `loadFormDataFromDatabase`
- ✅ `saveSection`
- ✅ `updateQuestionProgress`
- ✅ `hasDataForPreviousYear`
- ✅ `importFromPreviousYear`
- ✅ `saveChatMessage`
- ✅ `loadChatHistory`
- ✅ `loadQuestionProgress`
- ✅ `loadDocuments`
- ✅ DocumentService aktualisiert für `tax_filer_id` Support

---

## Nächste Schritte (Phase 6)

### Dashboard-Anpassung
- [ ] Steuererklärungen nach Person gruppieren
- [ ] Personen-Switcher im Dashboard-Header integrieren
- [ ] TaxFilerSelector in UserTaxReturns.tsx einbinden

### Upload-Komponenten
- [ ] Document-Upload mit `tax_filer_id` erweitern
- [ ] Checklist-Upload anpassen

---

## Implementierungsreihenfolge

| Phase | Aufwand | Beschreibung | Status |
|-------|---------|--------------|--------|
| 1 | ~2h | Datenbank: `tax_filers` Tabelle + RLS | ✅ Fertig |
| 2 | ~2h | Migration: Bestehende User zu Tax Filern | ✅ Fertig |
| 3 | ~4h | Frontend: `TaxFilerSelector` + Context | ✅ Fertig |
| 4 | ~3h | Frontend: Personen-Verwaltungsseite | ✅ Fertig |
| 5 | ~4h | Anpassung aller Queries (FormContext, Hooks) | ✅ Fertig |
| 6 | ~2h | Dashboard-Anpassung + Integration | ⏳ Ausstehend |

---

## Vorteile

- **Rückwärtskompatibel:** Bestehende Benutzer behalten ihre Daten
- **Skalierbar:** Beliebig viele Personen pro Account
- **Sauber getrennt:** Jede Person hat eigene Formulardaten
- **Flexibel:** Kann später für Ehepartner-gemeinsame Steuererklärung erweitert werden
