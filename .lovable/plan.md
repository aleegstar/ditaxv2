

# Plan: Datenbank-Constraint aktualisieren für Multi-Person Support

## Problemursache

Die Unique-Constraint `unique_user_tax_year` auf der Tabelle `tax_returns` prüft nur:
- `user_id`
- `tax_year`

Die `tax_filer_id` fehlt! Daher blockiert die Datenbank das Erstellen einer Steuererklärung für Leano (2024), weil Sandro bereits eine für 2024 hat.

---

## Lösung

Eine **Datenbankmigration** wird benötigt, um die Constraint zu ändern.

### SQL-Migration

```sql
-- Alte Constraint entfernen
ALTER TABLE tax_returns 
DROP CONSTRAINT unique_user_tax_year;

-- Neue Constraint mit tax_filer_id erstellen
ALTER TABLE tax_returns 
ADD CONSTRAINT unique_user_taxfiler_tax_year 
UNIQUE (user_id, tax_filer_id, tax_year);
```

---

## Betroffene Tabelle

| Tabelle | Constraint | Änderung |
|---------|-----------|----------|
| `tax_returns` | `unique_user_tax_year` | Erweitern um `tax_filer_id` |

---

## Ergebnis nach Migration

- Jede Person (tax_filer) kann ihre eigene Steuererklärung pro Jahr haben
- Der eindeutige Schlüssel basiert auf `user_id + tax_filer_id + tax_year`
- Der Fehler "Steuererklärung für 2024 bereits vorhanden" tritt nicht mehr auf, wenn unterschiedliche Personen gewählt werden

---

## Hinweis

Diese Migration ist **nicht destruktiv** - keine Daten gehen verloren. Die Constraint wird nur erweitert, um die neue Multi-Person-Architektur vollständig zu unterstützen.

