

# Plan: Synchronisierung Yes/No-Fragen mit Dokumenten-Checkliste

## Zusammenfassung

Die Analyse zeigt, dass die Dokumenten-Checkliste zwei Dokumente anfordert, für die **keine entsprechenden Yes/No-Fragen existieren**:
1. Mieteinnahmen-Belege (`hasRental`)
2. Dividenden-Bescheinigung (`hasDividends`)

## Identifizierte Probleme

### Problem 1: Mieteinnahmen
- **Checklist prüft:** `formData.income?.hasRental || formData.income?.rentalIncome > 0`
- **Yes/No-Frage:** Existiert nicht
- **Konsequenz:** Das Dokument wird nie angefragt, es sei denn, der User nutzt den Expert-Modus

### Problem 2: Dividenden
- **Checklist prüft:** `formData.income?.hasDividends || formData.income?.capitalIncome > 0`
- **Yes/No-Frage:** Existiert nicht
- **Konsequenz:** Das Dokument wird nie angefragt, es sei denn, der User nutzt den Expert-Modus

---

## Lösungsoptionen

### Option A: Yes/No-Fragen hinzufügen (Empfohlen)
Zwei neue Fragen zur `incomeQuestions` Konfiguration hinzufügen:

**Neue Fragen:**
```typescript
{
  id: 'hasRental',
  text: 'Hast du Mieteinnahmen?',
  explanation: 'Mieteinnahmen aus der Vermietung von Wohnungen, Häusern, Gewerberäumen oder anderen Immobilien müssen als Einkommen deklariert werden. Dies umfasst auch Untervermietungen und kurzfristige Vermietungen über Plattformen wie Airbnb.'
},
{
  id: 'hasDividends',
  text: 'Hast du Dividenden oder Kapitalerträge erhalten?',
  explanation: 'Dividenden aus Aktien, Genossenschaftsanteilen und anderen Beteiligungen sowie Zinserträge aus Obligationen und anderen Wertpapieren müssen als Einkommen deklariert werden. Dies gilt für in- und ausländische Erträge.'
}
```

### Option B: Checklisten-Checks entfernen
Die Checks für `hasRental` und `hasDividends` aus dem Checklist-Generator entfernen.

---

## Empfehlung

**Option A** ist empfohlen, da:
1. Mieteinnahmen und Dividenden steuerlich relevante Einkommen sind
2. Die Dokumenten-Checkliste die entsprechende Logik bereits enthält
3. Der User durch die Fragen korrekt geführt wird

---

## Technische Änderungen

| Datei | Zeile | Änderung |
|-------|-------|----------|
| `src/config/yesNoQuestions.ts` | nach Zeile 25 | Neue Frage `hasRental` einfügen |
| `src/config/yesNoQuestions.ts` | nach Zeile 25 | Neue Frage `hasDividends` einfügen |

---

## Komplette Übersicht nach Korrektur

Nach der Implementierung werden **alle** Dokumente korrekt basierend auf Yes/No-Antworten angefragt:

**Einkommen:** 8 Fragen → 8 Dokumente
**Vermögen:** 7 Fragen → 6 Dokumente (Fahrzeuge ausgenommen)
**Abzüge:** 9 Fragen → 9 Dokumente

