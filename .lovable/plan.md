

# Ladeloop beheben auf /form

## Ursachenanalyse

Nach Analyse des Codes gibt es zwei Hauptprobleme:

### 1. TaxFilerContext: Endlos-Lade-Schleife durch Dependency-Loop

In `TaxFilerContext.tsx` hat die `loadTaxFilers` Funktion (Zeile 108-156) die Dependencies `[session, activeTaxFilerId, taxFilers.length]`. Der Effect (Zeile 159-168) haengt von `loadTaxFilers` ab. Das Problem:

- `loadTaxFilers` laeuft, setzt `taxFilers` (length aendert sich 0 -> 2) und `activeTaxFilerId`
- Dadurch wird `loadTaxFilers` neu erstellt (weil Dependencies sich geaendert haben)
- Der Effect feuert erneut und ruft `loadTaxFilers` nochmal auf
- Dies erklaert die 3 identischen `tax_filers` API-Aufrufe in den Netzwerk-Logs
- Bei langsamer Verbindung koennen sich diese Aufrufe ueberlagern und den Ladezustand verlaengern

### 2. Kein Sicherheits-Timeout

Wenn eine der vielen Ladebedingungen in `Index.tsx` oder `FormContext.tsx` nicht rechtzeitig aufloest (z.B. durch Netzwerkproblem, Race Condition bei Auth-Token-Erneuerung), bleibt der Spinner unendlich stehen. Es gibt keinen Fallback-Mechanismus.

### 3. Nebenproblem: `should_show_mfa_prompt` 404-Fehler

Der RPC-Aufruf `should_show_mfa_prompt` gibt einen 404-Fehler zurueck (`relation "profiles" does not exist`). Dies ist ein Fehler in der Test-Datenbank-Migration, blockiert aber nicht direkt das Laden.

## Loesung

### 1. `TaxFilerContext.tsx` - Dependency-Loop beheben

Die `loadTaxFilers`-Funktion soll `activeTaxFilerId` und `taxFilers.length` ueber Refs statt als Callback-Dependencies verwenden. So wird die Funktion nicht bei jedem Statechange neu erstellt und der Effect feuert nicht mehrfach.

Konkret:
- `activeTaxFilerId` ueber einen Ref (`activeTaxFilerIdRef`) lesen statt direkt aus dem State
- `taxFilers.length` ueber einen Ref (`taxFilersRef`) lesen
- `loadTaxFilers` Dependencies reduzieren auf `[session]`
- Damit wird der Effect nur bei Session-Aenderungen neu ausgefuehrt, nicht bei jedem State-Update

### 2. `Index.tsx` - Sicherheits-Timeout hinzufuegen

Ein Timeout (z.B. 8 Sekunden) einfuegen, das den Ladezustand beendet, falls die Bedingungen nicht rechtzeitig aufloesen. Damit wird ein unendlicher Spinner verhindert.

Konkret:
- Ein `useEffect` mit `setTimeout` hinzufuegen, der nach 8 Sekunden den Ladezustand erzwingt
- Falls der Timeout ausloest, wird ein Warn-Log geschrieben zur Fehleranalyse
- Der Timeout wird aufgeraeumt wenn die Seite regulaer laedt

### 3. `useMfaPrompt.ts` - 404-Fehler abfangen

Den `should_show_mfa_prompt` Aufruf in einen Try-Catch mit sicherem Fallback wrappen, damit der 404-Fehler keine Seiteneffekte hat.

## Technische Aenderungen

### Datei 1: `src/contexts/TaxFilerContext.tsx`
- Refs hinzufuegen fuer `activeTaxFilerId` und `taxFilers`
- `loadTaxFilers` Dependencies auf `[session]` reduzieren
- Refs in `loadTaxFilers` statt State-Werte verwenden

### Datei 2: `src/pages/Index.tsx`
- Safety-Timeout State und Effect hinzufuegen
- Nach 8 Sekunden Ladezustand forciert beenden
- Warnung in Console loggen wenn Timeout ausloest

### Datei 3: `src/hooks/useMfaPrompt.ts`
- `should_show_mfa_prompt` Fehler sicher abfangen mit `shouldShow: false` Fallback statt throw

