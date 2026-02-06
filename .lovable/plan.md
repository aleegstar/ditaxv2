

# Plan: OCR-Erkennung verbessern für Lohnausweis

## Problem-Analyse

Das Dokument zeigt "Lohnausweis nicht eindeutig erkannt" - das bedeutet die Konfidenz ist unter 80%. Die möglichen Ursachen:

1. **tesseract-wasm erkennt zu wenig Text** - Die mobile OCR-Engine ist weniger leistungsfähig
2. **Keyword-Matching findet nicht genug Treffer** - Trotz der erweiterten Keywords
3. **Scoring-Schwellen zu hoch** - Bereits angepasst, aber möglicherweise noch zu streng

---

## Lösungsansatz: Dreifache Optimierung

### 1. Noch aggressivere Mobile-Schwellenwerte

Das OCR-Scoring für mobile Geräte noch weiter senken:

| Matches | Bisheriger Score | Neuer Score |
|---------|------------------|-------------|
| 3+ Keywords | 70-80 | **80** (Maximum) |
| 2 Keywords | 55 | **70** |
| 1 Keyword | 30 | **50** |

### 2. Toleranteres Keyword-Matching

Aktuell: Exakte Substring-Suche (`normalizedText.includes(normalizedKeyword)`)

Problem: OCR kann Wörter falsch trennen oder Zeichen falsch erkennen (z.B. "Lohn ausweis" statt "Lohnausweis")

Lösung: **Fuzzy-Matching** einführen:
- Wort-für-Wort-Suche statt nur zusammenhängend
- Kürzere Keyword-Varianten erlauben (z.B. "lohnausw" matcht auch)
- Levenshtein-Distanz für ähnliche Wörter (optional)

### 3. Besseres Debug-Logging

Statt pro Profil zu loggen, **einmalig** nach allen Matches loggen:
- Erkannter Text (erste 1000 Zeichen)
- Alle gematchten Keywords über alle Profile
- Spezifisch: employment-income Matches

---

## Technische Umsetzung

### Datei: `src/services/TesseractWasmOcrService.ts`

**A. Toleranteres Matching einführen:**

```typescript
matchKeywords(detectedTexts: string[], keywords: string[]) {
  // Normalisieren
  const normalizedText = detectedTexts.join(' ').toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue').replace(/ß/g, 'ss');
  
  // Wort-Array für Wort-basiertes Matching
  const words = normalizedText.split(/\s+/);
  
  for (const keyword of keywords) {
    const normalizedKeyword = keyword.toLowerCase()...;
    
    // Methode 1: Direkter Substring (wie bisher)
    if (normalizedText.includes(normalizedKeyword)) {
      matchedLabels.push(keyword);
      continue;
    }
    
    // Methode 2: Wort-Präfix-Match (für OCR-Fehler)
    // "lohnausw" matcht auch wenn OCR "lohnausweis" nicht vollständig erkennt
    const keywordPrefix = normalizedKeyword.substring(0, Math.min(6, normalizedKeyword.length));
    if (words.some(word => word.startsWith(keywordPrefix) && word.length >= keywordPrefix.length)) {
      matchedLabels.push(keyword);
      continue;
    }
  }
}
```

**B. Debug-Logging optimieren:**

Nur einmal loggen (im DocumentValidator, nicht pro Profil), mit Fokus auf das relevante Profil.

### Datei: `src/services/DocumentValidator.ts`

**C. Mobile-Schwellenwerte weiter senken:**

```typescript
if (isMobileOcr) {
  // Ultra-mobile-optimierte Schwellenwerte
  if (ocrMatchCount >= 3) {
    ocrScore = 80;  // War: 4 für 80, 3 für 70
  } else if (ocrMatchCount >= 2) {
    ocrScore = 70;  // War: 55
  } else if (ocrMatchCount >= 1) {
    ocrScore = 50;  // War: 30
  }
}
```

---

## Betroffene Dateien

| Datei | Änderung |
|-------|----------|
| `src/services/TesseractWasmOcrService.ts` | Toleranteres Matching, besseres Logging |
| `src/services/DocumentValidator.ts` | Niedrigere Mobile-Schwellenwerte |

---

## Erwartetes Ergebnis

Nach diesen Änderungen sollte der Lohnausweis:
- Mit 2-3 erkannten Keywords bereits 70-80% Konfidenz erreichen
- Durch toleranteres Matching mehr Keywords finden
- Zuverlässig als "erkannt" klassifiziert werden

