

# Fix: Session-Race-Conditions zwischen App und ProtectedRoute beseitigen

## Ursachenanalyse

Das Problem entsteht durch **doppelte, unabhaengige Auth-Validierung** mit kuenstlichen Verzoegerungen:

1. **Aeussere Pruefung (App.tsx)**: Prueft die Session, setzt `isAuthenticated=true`, rendert `AuthenticatedApp`
2. **Innere Pruefung (ProtectedRoute via useAuthValidation)**: Startet eine **komplett neue** Session-Pruefung mit 150ms Verzoegerung + 100ms Debounce

Zwischen Schritt 1 und Schritt 2 gibt es ein Zeitfenster, in dem `useAuthValidation` noch `isValid=false` und `isLoading=true` meldet. Falls durch Timing-Probleme `isLoading` auf `false` wechselt bevor `isValid` auf `true` steht, zeigt `ProtectedRoute` den "Bitte anmelden"-Toast und leitet zu `/auth` weiter -- obwohl der User eingeloggt ist.

Zusaetzlich erstellt **jede Route mit ProtectedRoute** eine eigene `useAuthValidation`-Instanz, was zu vielen parallelen `getSession()`-Aufrufen fuehrt und die Race Condition verschaerft.

## Loesung: Zentraler AuthContext als Single Source of Truth

Statt dass jede `ProtectedRoute`-Instanz unabhaengig validiert, wird ein zentraler `AuthContext` eingefuehrt, der den Auth-State einmalig verwaltet und an alle Komponenten weitergibt.

### Schritt 1: AuthContext erstellen

Neue Datei `src/contexts/AuthContext.tsx`:

- Verwaltet `userId`, `email`, `isValid`, `isLoading` zentral
- Registriert **einen einzigen** `onAuthStateChange`-Listener
- Ruft `getSession()` nur einmal beim Initialisieren auf
- Stellt den Idle-Timer bereit (30-Minuten Auto-Logout)
- Exportiert `useAuth()` Hook fuer alle Konsumenten

### Schritt 2: App.tsx anpassen

- `AuthContext.Provider` einbinden (innerhalb von `BrowserRouter`)
- Die bestehende `isAuthenticated`-Logik in `App` durch `useAuth()` aus dem Context ersetzen
- Die OAuth-Token-Behandlung (`handleUrlTokens`, `handleOAuthSuccessSignal`) bleibt in `App.tsx`, setzt aber den Context-State

### Schritt 3: ProtectedRoute vereinfachen

- `useAuthValidation()` durch `useAuth()` ersetzen
- Keine eigene Session-Pruefung mehr -- liest nur noch den zentralen State
- Kein Toast und kein Redirect wenn `isLoading=true`
- Redirect zu `/auth` nur wenn `isLoading=false` UND `isValid=false`

### Schritt 4: useAuthValidation anpassen

- Die bestehende Hook-Logik wird in den AuthContext verschoben
- `useAuthValidation` wird zu einem duennen Wrapper um `useAuth()`
- Bestehende Aufrufe (z.B. `AuthenticatedApp` fuer Idle-State) funktionieren weiterhin

### Schritt 5: PaymentSection pruefen

- `PaymentSection.tsx` hat bereits den Fix (Listener vor getSession) -- bleibt wie ist
- Zusaetzlich kann `isLoggedIn` durch den zentralen Context ersetzt werden

## Erwartetes Ergebnis

- **Eine einzige** Session-Pruefung statt einer pro Route
- Kein Zeitfenster mehr zwischen aeusserer und innerer Auth-Pruefung
- Keine falschen "Bitte anmelden"-Toasts
- Keine falschen Redirects zu `/auth` bei eingeloggten Usern
- Idle-Timer und Force-Logout funktionieren weiterhin

## Technische Details

### Neue Datei: `src/contexts/AuthContext.tsx`

```typescript
// Zentraler Auth-State mit einem einzigen Listener
const AuthProvider = ({ children }) => {
  const [state, setState] = useState({ userId, email, isValid, isLoading: true });

  useEffect(() => {
    // 1. Listener registrieren
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setState({
          userId: session?.user?.id ?? null,
          email: session?.user?.email ?? null,
          isValid: !!session,
          isLoading: false
        });
      }
    );
    // 2. Initiale Session pruefen
    supabase.auth.getSession().then(({ data: { session } }) => {
      setState({ ... , isLoading: false });
    });
    return () => subscription.unsubscribe();
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
};
```

### Aenderung: `src/components/guards/ProtectedRoute.tsx`

```typescript
// Vorher: eigene useAuthValidation() mit Delays
// Nachher: liest nur den zentralen Context
const ProtectedRoute = ({ children }) => {
  const { isValid, isLoading } = useAuth();
  
  if (isLoading) return null; // Warten, kein Redirect
  if (!isValid) return <Navigate to="/auth" replace />;
  return <>{children}</>;
};
```

### Aenderung: `src/App.tsx`

```typescript
// AuthProvider wird um BrowserRouter-Inhalt gewickelt
<BrowserRouter>
  <AuthProvider>
    <SpaRedirector />
    <Routes>...</Routes>
  </AuthProvider>
</BrowserRouter>
```

Die `isAuthenticated`-State-Variable in `App` wird durch `useAuth()` ersetzt, sodass nur noch ein einziger Auth-State existiert.

