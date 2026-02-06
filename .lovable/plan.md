
# OCR-Zuteilung verbessern: Lohnausweis vs. Rentenbescheinigung

## Problem-Analyse

Das offizielle Schweizer Lohnausweis-Formular (Formular 11) enthält den zweisprachigen Titel:
- "Lohnausweis - Certificat de salaire - Certificato di salario"
- "Rentenbescheinigung - Attestation de rentes - Attestazione delle rendite"

Dies führt dazu, dass Keywords wie "Rente" und "Rentenbescheinigung" fälschlicherweise das `pension-income` Profil matchen.

---

## Lösungsansatz

### 1. Erweiterte Keywords für Lohnausweis

Neue spezifische Keywords hinzufügen, die auf dem Formular 11 prominent vorkommen:

| Neue Keywords | Begründung |
|--------------|------------|
| `salaire`, `salario` | Französisch/Italienisch für Lohn |
| `berufliche vorsorge` | Feld 10 auf dem Formular |
| `lohn`, `gehalt` | Allgemeine Synonyme |
| `cotisations avs`, `contributi avs` | Mehrsprachige AHV-Beiträge |
| `spesenentschädigung`, `pauschalspesen` | Spezifische Felder |
| `frais effectifs`, `frais forfaitaires` | Französische Spesenbezeichnungen |
| `form. 11`, `605.040.18` | Formularnummern |
| `weiterbildung`, `perfectionement` | Feld 13.3 |

### 2. Negative Keywords für pension-income

Keywords hinzufügen, die bei einer Rentenbescheinigung NICHT vorkommen sollten:

```typescript
negativeKeywords: ['bruttolohn', 'nettolohn', 'arbeitgeber', 'salaire', 'gehalt', 'spesen']
```

### 3. Stärkere Priorisierung bei Dokument-Spezifität

Die Scoring-Logik anpassen: Wenn ein Dokument sowohl Lohnausweis- als auch Renten-Keywords enthält, aber die Lohnausweis-spezifischen überwiegen, sollte der Lohnausweis priorisiert werden.

---

## Technische Umsetzung

### Datei: `src/config/documentProfiles.ts`

**A. Employment-Income Keywords erweitern:**

```typescript
keywordHints: [
  // Primäre Keywords
  'lohnausweis', 'lohnbescheinigung', 'certificat de salaire', 'certificato di salario',
  // Formular-Identifikatoren  
  'formular 11', 'form. 11', '605.040.18',
  // Lohn-Begriffe (DE/FR/IT)
  'bruttolohn', 'nettolohn', 'lohn', 'gehalt', 'salaire', 'salario', 'jahreslohn',
  // Arbeitgeber
  'arbeitgeber', 'employeur', 'datore di lavoro',
  // Sozialabzüge
  'ahv', 'ahv/iv/eo', 'avs', 'sozialabzüge', 'cotisations', 'contributi',
  // Spesen
  'spesenentschädigung', 'pauschalspesen', 'effektive spesen', 'frais effectifs',
  // Vorsorge im Lohnkontext
  'berufliche vorsorge', 'bvg', 'pensionskasse',
  // Weitere Felder
  'quellensteuer', 'weiterbildung', 'nebenleistungen'
]
```

**B. Pension-Income negativeKeywords ergänzen:**

```typescript
negativeKeywords: [
  'bruttolohn', 'nettolohn', 'arbeitgeber', 'salaire', 'gehalt', 
  'spesen', 'weiterbildung', 'nebenleistungen'
]
```

### Datei: `src/services/DocumentValidator.ts`

**C. Negative Keywords in Scoring berücksichtigen:**

Die `calculateScore`-Funktion anpassen, um negativeKeywords abzuziehen:

```typescript
// Bei OCR-Scoring: Negative Keywords prüfen
const negativeMatchCount = signals.keywords?.matchCountsByDocType[`${profile.id}:negative`] || 0;
if (negativeMatchCount > 0) {
  ocrScore -= (negativeMatchCount * 15); // Pro negativem Match 15 Punkte Abzug
  reasons.push(`Unpassende Begriffe gefunden (-${negativeMatchCount * 15})`);
}
```

---

## Betroffene Dateien

| Datei | Änderung |
|-------|----------|
| `src/config/documentProfiles.ts` | Keywords erweitern, negativeKeywords hinzufügen |
| `src/services/DocumentValidator.ts` | Negative Keyword Matching implementieren |
| `src/services/TesseractWasmOcrService.ts` | Negative Keyword Support (optional) |

---

## Erwartetes Ergebnis

Nach der Änderung sollte das Formular 11 (Lohnausweis):
- 8-12 Keyword-Matches für `employment-income` erzielen
- 2-3 Negative-Matches für `pension-income` haben
- Eindeutig mit >80% Konfidenz als Lohnausweis erkannt werden

