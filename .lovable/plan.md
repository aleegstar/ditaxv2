

## Plan: Chatbot soll bei mehreren Tax Filern nachfragen

### Problem
Wenn ein User mehrere steuerpflichtige Personen hat (z.B. Hauptperson + Ehepartner + Kind), weiss der Bot nicht, über welche Person der User spricht. Der Bot listet zwar den Status aller Personen auf, aber der User muss die Person nicht spezifizieren.

### Lösung
Den System-Prompt in der Edge Function erweitern mit einer klaren Anweisung:

**Datei: `supabase/functions/chatbot-response/index.ts`**

Im System-Prompt (ab Zeile 448, Abschnitt "KONTEXTBASIERTE HILFE") eine neue Regel hinzufügen:

```
MULTI-PERSONEN-REGELN:
- Wenn der User mehrere steuerpflichtige Personen hat, frage IMMER nach, auf welche Person sich die Frage bezieht, bevor du eine statusbezogene Antwort gibst.
- Nenne dabei die verfügbaren Personen mit Vorname und Beziehung (z.B. "Meinst du Sandro (Hauptperson) oder Amelia (Kind)?")
- Wenn der User nur eine steuerpflichtige Person hat, antworte direkt ohne Nachfrage.
- Wenn der User bereits eine Person namentlich erwähnt hat, beziehe dich auf diese Person.
```

Zusätzlich wird im Status-Kontext die Anzahl der Tax Filer als Meta-Info ergänzt (z.B. `Anzahl steuerpflichtige Personen: 3`), damit der Bot einfach entscheiden kann, ob er nachfragen muss.

### Umfang
- Nur die Edge Function wird angepasst (System-Prompt + eine Zeile im Status-Output)
- Kein Frontend-Umbau nötig

