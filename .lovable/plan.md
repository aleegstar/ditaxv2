

# Code-Überprüfung: Sicherheit, Performance & Verbesserungspotenzial

## Zusammenfassung

Nach einer umfassenden Analyse des Projekts kann ich bestätigen: **Die Sicherheitsarchitektur ist sehr solide implementiert**. Es gibt jedoch einige **kritische RLS-Lücken** und **Performance-Optimierungsmöglichkeiten**.

---

## 1. SICHERHEIT - Stärken

### Was bereits sehr gut umgesetzt ist:

| Bereich | Implementation | Status |
|---------|----------------|--------|
| Server-seitige Admin-Verifizierung | `has_role()` RPC-Funktion | Korrekt |
| Input-Validierung | Zod-Schemas in Edge Functions | Korrekt |
| Rate Limiting | Progressive Blocking, 10 Req/5 Min für Admin-Ops | Korrekt |
| SQL Injection Protection | Parameterisierte Queries via Supabase Client | Korrekt |
| CSRF Protection | Token-basiert in `securityHeaders.ts` | Korrekt |
| Audit Logging | Immutable Logs mit Hash-Kette | Korrekt |
| Session Management | 30-Minuten Idle-Timeout, Auto-Logout | Korrekt |
| Storage RLS | Bucket-Policies mit Ordner-Validierung | Korrekt |
| Passwort-los Auth | OTP + WebAuthn/Passkeys | Korrekt |
| 2FA/MFA | TOTP-basiert mit Enrollment-Flow | Korrekt |
| Verschlüsselung | AES-256-GCM für sensible Felder | Korrekt |
| Two-Person Approval | Admin-Aktionen benötigen zweite Genehmigung | Korrekt |

---

## 2. SICHERHEIT - Kritische Findings

### Problem 1: `profiles` Tabelle - Öffentlicher Lesezugriff

**Risiko: HOCH**

Die Security-Scan zeigt, dass die `profiles`-Tabelle unter Umständen für unauthentifizierte Benutzer lesbar sein könnte. Die aktuelle Policy erlaubt nur `authenticated` Benutzer, aber es fehlt eine explizite Blockierung für `anon`.

**Betroffene sensible Daten:**
- E-Mail-Adressen
- Telefonnummern  
- Physische Adressen
- Geburtsdaten
- Admin-Notizen

**Lösung:**
```sql
-- Explizit anon-Zugriff blockieren
CREATE POLICY "Block anonymous access to profiles"
ON public.profiles
FOR SELECT
TO anon
USING (false);
```

### Problem 2: `account_deletion_feedback` - Fehlende SELECT-Policy

**Risiko: MITTEL**

Die Tabelle enthält E-Mail-Adressen gelöschter Benutzer. Aktuell existiert nur eine INSERT-Policy für `service_role`, aber keine restriktive SELECT-Policy.

**Lösung:**
```sql
CREATE POLICY "Only admins can view deletion feedback"
ON public.account_deletion_feedback
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
```

### Problem 3: `user_roles` - Fehlende SELECT-Policy

**Risiko: MITTEL**

Angreifer könnten Admin-Benutzer enumerieren.

**Lösung:**
```sql
CREATE POLICY "Users can view own role"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
```

### Problem 4: Leaked Password Protection

**Risiko: NIEDRIG** (Da passwordless)

Supabase zeigt "Leaked Password Protection Disabled". Da die App jedoch passwordless arbeitet (OTP/Passkeys), ist dies kein kritisches Risiko.

**Empfehlung:** Trotzdem im Supabase Dashboard aktivieren unter:
`Authentication → Attack Protection → Enable Leaked Password Protection`

---

## 3. PERFORMANCE - Verbesserungspotenzial

### Problem 1: Kein Code-Splitting / Lazy Loading

**Impact: HOCH**

Aktuell werden **alle Seiten** beim initialen Laden gebündelt. Bei 40+ Seiten führt dies zu:
- Lange initiale Ladezeit
- Unnötiger Bandbreitenverbrauch
- Schlechte Core Web Vitals

**Aktuelle Situation:**
```tsx
// App.tsx - Alle Imports synchron
import AdminPanel from "./pages/Admin";
import UserTaxReturns from "./pages/UserTaxReturns";
import Chat from "./pages/Chat";
// ... 30+ weitere synchrone Imports
```

**Empfohlene Lösung:**
```tsx
import { lazy, Suspense } from 'react';

const AdminPanel = lazy(() => import('./pages/Admin'));
const UserTaxReturns = lazy(() => import('./pages/UserTaxReturns'));
const Chat = lazy(() => import('./pages/Chat'));

// Verwendung mit Suspense
<Suspense fallback={<LoadingSpinner />}>
  <Routes>
    <Route path="/admin/*" element={<AdminPanel />} />
    ...
  </Routes>
</Suspense>
```

**Erwartete Verbesserung:** 40-60% kleineres Initial Bundle

### Problem 2: Fehlende React Query Nutzung

**Impact: MITTEL**

TanStack Query ist installiert, wird aber kaum genutzt. Stattdessen werden `useState` + `useEffect` für Daten verwendet.

**Aktuelle Situation (useProfile.ts):**
```tsx
const [profile, setProfile] = useState<Profile | null>(null);
const [loading, setLoading] = useState(true);

useEffect(() => {
  fetchProfile();
}, []);
```

**Empfohlene Lösung:**
```tsx
const { data: profile, isLoading } = useQuery({
  queryKey: ['profile', userId],
  queryFn: fetchProfile,
  staleTime: 5 * 60 * 1000, // 5 Minuten Cache
});
```

**Vorteile:**
- Automatisches Caching
- Deduplizierung von Requests
- Optimistic Updates
- Background Refetching

### Problem 3: Keine Prefetching-Strategie

**Impact: MITTEL**

Bei Navigation werden Daten erst geladen wenn die Seite erreicht wird.

**Empfehlung:**
```tsx
// Bei Hover über Navigation-Links
onMouseEnter={() => {
  queryClient.prefetchQuery({
    queryKey: ['documents', userId],
    queryFn: fetchDocuments,
  });
}}
```

### Problem 4: Keine Bundle-Optimierung in Vite

**Impact: MITTEL**

Die `vite.config.ts` enthält keine Build-Optimierungen.

**Empfohlene Ergänzungen:**
```typescript
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'vendor-react': ['react', 'react-dom', 'react-router-dom'],
        'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
        'vendor-supabase': ['@supabase/supabase-js'],
        'vendor-charts': ['recharts'],
      }
    }
  },
  chunkSizeWarningLimit: 500,
}
```

---

## 4. CODE-QUALITÄT - Bereits gut

| Aspekt | Status | Details |
|--------|--------|---------|
| TypeScript | Sehr gut | Strenge Typisierung durchgehend |
| useMemo/useCallback | Gut | 343 Verwendungen in Komponenten |
| Error Boundaries | Gut | Global und pro-Route implementiert |
| ErrorBoundary | Gut | Mit Android-spezifischem Handling |
| Form Validation | Sehr gut | Zod + react-hook-form |
| i18n | Gut | Vollständig implementiert |
| Accessibility | Basis | Radix UI Komponenten bieten a11y |

---

## 5. EMPFOHLENE PRIORISIERUNG

### Sofort (Kritisch):
1. RLS-Policy für `profiles` Tabelle gegen `anon` absichern
2. SELECT-Policy für `account_deletion_feedback` hinzufügen
3. SELECT-Policy für `user_roles` hinzufügen

### Kurzfristig (Performance):
4. Lazy Loading für Seiten implementieren
5. TanStack Query für Daten-Fetching nutzen
6. Bundle-Splitting in Vite konfigurieren

### Mittelfristig (Nice-to-have):
7. Prefetching-Strategie implementieren
8. Service Worker für Offline-Caching
9. Image-Optimierung mit lazy loading

---

## Technische Details der RLS-Fixes

**Migration für alle drei RLS-Probleme:**

```sql
-- 1. Block anonymous access to profiles
CREATE POLICY "Block anonymous access to profiles"
ON public.profiles
FOR SELECT
TO anon
USING (false);

-- 2. Restrict account_deletion_feedback access
CREATE POLICY "Only admins can view deletion feedback"
ON public.account_deletion_feedback
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. Restrict user_roles visibility
CREATE POLICY "Users can view own role only"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR 
  has_role(auth.uid(), 'admin'::app_role)
);
```

---

## Fazit

**Sicherheit: 8.5/10** - Sehr solide Basis, aber 3 RLS-Lücken müssen geschlossen werden

**Performance: 6/10** - Funktional, aber ohne moderne Optimierungen

**Code-Qualität: 8/10** - Gute Patterns, TypeScript, Error Handling

Die kritischen Sicherheitslücken sollten sofort behoben werden. Die Performance-Optimierungen können schrittweise implementiert werden und bringen signifikante Verbesserungen für die User Experience.

