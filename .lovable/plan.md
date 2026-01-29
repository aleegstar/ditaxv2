
# Erweiterung des Welcome-Flows für Multi-Personen

## Aktuelle Situation

Der Welcome-Flow besteht aus 3 Schritten:
1. **Datenschutz & Einwilligungen** (Consent)
2. **Vorname** (First Name)
3. **Steuerjahr** (Tax Year)

Nach Abschluss wird automatisch ein "Primary" Tax Filer mit dem eingegebenen Vornamen erstellt (durch den Datenbank-Trigger).

---

## Optionen zur Erweiterung

### Option A: Hinweis am Ende (Empfohlen - Minimal)

Nach Schritt 3 (Steuerjahr) wird ein **kurzer Hinweis** angezeigt, dass weitere Personen hinzugefügt werden können:

```text
+------------------------------------------+
|  💡 Tipp                                 |
|                                          |
|  Du kannst auch Steuererklärungen        |
|  für Familienmitglieder erstellen.       |
|                                          |
|  [Später einrichten]  [Jetzt hinzufügen] |
+------------------------------------------+
```

**Vorteile:**
- Macht User auf die Funktion aufmerksam
- Blockiert nicht den Hauptflow
- Schnelles Onboarding bleibt erhalten

---

### Option B: Optionaler Schritt 4 (Erweitert)

Ein neuer **optionaler Schritt** nach dem Steuerjahr:

```text
Schritt 4: "Erstellst du die Steuererklärung für weitere Personen?"

[ ] Ja, für Familienmitglieder (Kinder, Ehepartner, etc.)
[ ] Nein, nur für mich selbst

Falls "Ja":
→ Weiterleitung zu /tax-filers nach Onboarding
→ Oder: Inline-Formular zum direkten Hinzufügen
```

**Vorteile:**
- Proaktive Abfrage der Nutzungsabsicht
- Bessere Vorbereitung des Users

**Nachteile:**
- Verlängert das Onboarding
- Könnte neue User überfordern

---

### Option C: Kein Zusatz im Onboarding

Stattdessen wird die Multi-Personen-Funktion **im Dashboard prominent** beworben:

- Banner/Card auf der Startseite: "Steuererklärung für Familienmitglieder erstellen"
- Eintrag in der Sidebar/Navigation
- Tooltip beim ersten Besuch

---

## Empfehlung

**Option A (Hinweis am Ende)** ist die beste Balance:

1. Hält das Onboarding schlank (3 Schritte bleiben)
2. Informiert neue User über die Funktion
3. "Jetzt hinzufügen" leitet direkt zu `/tax-filers` weiter
4. "Später einrichten" navigiert normal zum Dashboard

---

## Technische Umsetzung (Option A)

### Änderungen

| Datei | Änderung |
|-------|----------|
| `WelcomeFlow.tsx` | Neuer Zustand `showFamilyHint` nach Schritt 3 |
| `translations.ts` | Neue Keys für Hinweis-Texte |

### Ablauf

```text
Schritt 1 → Schritt 2 → Schritt 3 → [Hinweis-Modal] → Dashboard oder /tax-filers
```

### Neuer Code-Block (vereinfacht)

```typescript
// Nach handleComplete(), vor Navigation:
if (!showFamilyHint) {
  setShowFamilyHint(true);
  return; // Zeige Hinweis statt direkt zu navigieren
}

// Wenn User "Später" wählt → navigate('/')
// Wenn User "Jetzt hinzufügen" wählt → navigate('/tax-filers')
```

### i18n-Keys

```typescript
onboarding: {
  familyHintTitle: 'Steuererklärung für andere?',
  familyHintDescription: 'Du kannst auch Steuererklärungen für Familienmitglieder (Kinder, Ehepartner) unter deinem Account erstellen.',
  familyHintLater: 'Später einrichten',
  familyHintNow: 'Jetzt hinzufügen'
}
```

---

## Aufwand

| Option | Aufwand | Komplexität |
|--------|---------|-------------|
| A (Hinweis) | ~1-2h | Niedrig |
| B (Extra Schritt) | ~3-4h | Mittel |
| C (Kein Onboarding) | 0h | - |

---

## Frage an dich

Welche Option bevorzugst du?

- **Option A**: Kurzer Hinweis nach dem letzten Schritt
- **Option B**: Optionaler vierter Schritt mit Abfrage
- **Option C**: Keine Änderung am Onboarding, stattdessen Dashboard-Banner
