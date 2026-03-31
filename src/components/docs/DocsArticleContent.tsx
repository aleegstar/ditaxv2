import React from 'react';
import ReactMarkdown from 'react-markdown';
import { ShieldCheck, TrendingUp, Zap, UserPlus, Upload, MessageCircle, FileCheck, Info, ArrowRight, Check, Camera, File, Search, CreditCard, Smartphone, Clock, ChevronRight, Star, Lock, Bell } from 'lucide-react';
import { docsCategories } from './DocsContent';

interface DocsArticleContentProps {
  articleId: string;
  categoryId: string;
}

export const DocsArticleContent: React.FC<DocsArticleContentProps> = ({ articleId, categoryId }) => {
  const category = docsCategories.find(c => c.id === categoryId);
  const article = category?.articles.find(a => a.id === articleId);

  if (!article || !category) return null;

  // Rich layouts for specific articles
  if (articleId === 'introduction' && categoryId === 'getting-started') {
    return <IntroductionArticle categoryTitle={category.title} />;
  }

  // Get the mockup component for this article
  const MockupComponent = articleMockups[articleId];

  return (
    <div>
      {/* Breadcrumb */}
      <p className="text-sm text-primary font-medium mb-2">{category.title}</p>
      <h1 className="text-[28px] sm:text-[32px] font-bold text-foreground leading-tight mb-3">{article.title}</h1>

      {/* Subtitle */}
      {article.subtitle && (
        <p className="text-base text-muted-foreground leading-relaxed mb-8">{article.subtitle}</p>
      )}

      {/* Mockup for this article */}
      {MockupComponent && <MockupComponent />}

      {/* Markdown content */}
      <div className="prose prose-sm max-w-none
        prose-headings:text-foreground prose-headings:font-semibold
        prose-h2:text-[20px] prose-h2:mt-10 prose-h2:mb-3
        prose-h3:text-[16px] prose-h3:mt-7 prose-h3:mb-2
        prose-p:text-foreground/70 prose-p:leading-[1.75] prose-p:my-3
        prose-li:text-foreground/70 prose-li:my-1 prose-li:leading-[1.75]
        prose-ul:my-3 prose-ol:my-3
        prose-strong:text-foreground prose-strong:font-semibold
        prose-code:text-primary prose-code:bg-primary/5 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-[13px]
        prose-blockquote:border-l-primary/30 prose-blockquote:bg-primary/[0.03] prose-blockquote:rounded-r-xl prose-blockquote:py-3 prose-blockquote:px-4 prose-blockquote:not-italic prose-blockquote:text-foreground/70
      ">
        <ReactMarkdown>{article.content}</ReactMarkdown>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════
   UI Mockup Components
   ══════════════════════════════════════════════════ */

const MockupFrame: React.FC<{ children: React.ReactNode; title?: string }> = ({ children, title }) => (
  <div className="border border-border/50 rounded-xl overflow-hidden bg-muted/10 my-6">
    <div className="bg-muted/30 border-b border-border/50 px-4 py-2 flex items-center gap-2">
      <div className="flex gap-1.5">
        <div className="w-2.5 h-2.5 rounded-full bg-red-300/60" />
        <div className="w-2.5 h-2.5 rounded-full bg-amber-300/60" />
        <div className="w-2.5 h-2.5 rounded-full bg-emerald-300/60" />
      </div>
      {title && <span className="text-[11px] text-muted-foreground/60 ml-2">{title}</span>}
    </div>
    <div className="p-4 sm:p-5">
      {children}
    </div>
  </div>
);

/* ── Dashboard Mockup ── */
const DashboardMockup = () => (
  <MockupFrame title="Dashboard">
    <div className="space-y-3">
      {/* Tax year card */}
      <div className="rounded-2xl border border-primary/15 bg-primary/[0.03] p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs text-muted-foreground">Steuerjahr</p>
            <p className="text-lg font-bold text-foreground">2025</p>
          </div>
          <span className="text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full">
            In Erfassung
          </span>
        </div>
        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-[11px] text-muted-foreground">
            <span>Fortschritt</span>
            <span>65%</span>
          </div>
          <div className="h-2 bg-muted/50 rounded-full overflow-hidden">
            <div className="h-full w-[65%] bg-gradient-to-r from-primary to-primary/70 rounded-full" />
          </div>
        </div>
      </div>

      {/* Quick status items */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: 'Angaben', status: '3/4 erledigt', color: 'text-amber-600' },
          { label: 'Dokumente', status: '5/7 hochgeladen', color: 'text-amber-600' },
        ].map((item, i) => (
          <div key={i} className="rounded-xl border border-border/40 p-3">
            <p className="text-[11px] text-muted-foreground mb-0.5">{item.label}</p>
            <p className={`text-xs font-medium ${item.color}`}>{item.status}</p>
          </div>
        ))}
      </div>
    </div>
  </MockupFrame>
);

/* ── Upload Mockup ── */
const UploadMockup = () => (
  <MockupFrame title="Dokumente hochladen">
    <div className="space-y-3">
      {/* Upload area */}
      <div className="border-2 border-dashed border-primary/20 rounded-xl p-6 text-center bg-primary/[0.02]">
        <Upload className="w-8 h-8 text-primary/40 mx-auto mb-2" />
        <p className="text-sm font-medium text-foreground/70">Dokument hochladen</p>
        <p className="text-xs text-muted-foreground mt-1">PDF, Foto oder Scan</p>
        <div className="flex items-center justify-center gap-3 mt-3">
          <span className="inline-flex items-center gap-1.5 text-xs text-primary bg-primary/5 px-3 py-1.5 rounded-full">
            <Camera className="w-3.5 h-3.5" /> Foto
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs text-primary bg-primary/5 px-3 py-1.5 rounded-full">
            <File className="w-3.5 h-3.5" /> Datei
          </span>
        </div>
      </div>

      {/* Uploaded files */}
      <div className="space-y-2">
        {[
          { name: 'Lohnausweis_2025.pdf', status: 'Erkannt', icon: '✅' },
          { name: 'Kontoauszug_UBS.pdf', status: 'Zugewiesen', icon: '✅' },
          { name: 'Foto_0847.heic', status: 'Wird analysiert...', icon: '🔄' },
        ].map((file, i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border/40 bg-background">
            <span className="text-sm">{file.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">{file.name}</p>
              <p className="text-[11px] text-muted-foreground">{file.status}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </MockupFrame>
);

/* ── Form Mockup ── */
const FormMockup = () => (
  <MockupFrame title="Angaben erfassen – Einkommen">
    <div className="space-y-4">
      {/* Mode switcher */}
      <div className="flex gap-2">
        <span className="text-xs font-medium text-white bg-primary px-3 py-1.5 rounded-full">Geführt</span>
        <span className="text-xs font-medium text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">Experte</span>
      </div>

      {/* Chat-style question */}
      <div className="bg-primary/[0.04] rounded-2xl p-4 border border-primary/10">
        <p className="text-sm text-foreground/80">
          Warst du im Jahr 2025 bei einem Arbeitgeber angestellt?
        </p>
        <div className="flex gap-2 mt-3">
          <span className="text-xs font-medium text-primary border border-primary/30 bg-primary/5 px-4 py-2 rounded-full">Ja</span>
          <span className="text-xs font-medium text-foreground/60 border border-border/50 px-4 py-2 rounded-full">Nein</span>
        </div>
      </div>

      {/* Form fields preview */}
      <div className="space-y-3">
        <div>
          <label className="text-[11px] font-medium text-muted-foreground block mb-1">Arbeitgeber</label>
          <div className="h-9 rounded-lg border border-border/50 bg-background px-3 flex items-center">
            <span className="text-xs text-foreground/40">z.B. Muster AG</span>
          </div>
        </div>
        <div>
          <label className="text-[11px] font-medium text-muted-foreground block mb-1">Bruttolohn (gemäss Lohnausweis)</label>
          <div className="h-9 rounded-lg border border-border/50 bg-background px-3 flex items-center">
            <span className="text-xs text-foreground/40">CHF</span>
          </div>
        </div>
      </div>
    </div>
  </MockupFrame>
);

/* ── Status/Tracking Mockup ── */
const StatusMockup = () => (
  <MockupFrame title="Status-Tracking">
    <div className="space-y-0">
      {[
        { title: 'Daten eingereicht', status: 'done' as const },
        { title: 'Unterlagen erhalten', status: 'done' as const },
        { title: 'Zahlung bestätigt', status: 'done' as const },
        { title: 'In Bearbeitung', status: 'active' as const, badge: 'In Bearbeitung' },
        { title: 'Qualitätsprüfung', status: 'pending' as const },
        { title: 'Zustellung', status: 'pending' as const },
      ].map((step, i, arr) => (
        <div key={i} className="flex gap-3 relative">
          {/* Connector line */}
          {i < arr.length - 1 && (
            <div className={`absolute left-[11px] top-[24px] bottom-0 w-[2px] ${
              step.status === 'done' && arr[i+1].status === 'done' ? 'bg-primary' :
              step.status === 'done' && arr[i+1].status === 'active' ? 'bg-gradient-to-b from-primary to-border' :
              'bg-border/40'
            }`} />
          )}
          {/* Icon */}
          <div className="relative z-10 shrink-0 mt-0.5">
            {step.status === 'done' ? (
              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
              </div>
            ) : step.status === 'active' ? (
              <div className="w-6 h-6 rounded-full border-2 border-primary bg-background flex items-center justify-center">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              </div>
            ) : (
              <div className="w-6 h-6 rounded-full bg-muted/50 border border-border/50 flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-muted-foreground/30 rounded-full" />
              </div>
            )}
          </div>
          {/* Text */}
          <div className="pb-5">
            <div className="flex items-center gap-2">
              <p className={`text-xs font-medium ${
                step.status === 'pending' ? 'text-muted-foreground/40' : 'text-foreground'
              }`}>{step.title}</p>
              {step.badge && (
                <span className="text-[10px] font-medium bg-amber-50 text-amber-600 border border-amber-100 px-2 py-0.5 rounded-full">
                  {step.badge}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  </MockupFrame>
);

/* ── Payment Mockup ── */
const PaymentMockup = () => (
  <MockupFrame title="Bezahlung">
    <div className="space-y-3">
      {/* Price summary */}
      <div className="rounded-xl border border-border/40 p-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-muted-foreground">Steuererklärung 2025</span>
          <span className="text-sm font-bold text-foreground">CHF 150.00</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">Express-Zuschlag</span>
          <span className="text-sm font-medium text-foreground">CHF 50.00</span>
        </div>
        <div className="border-t border-border/40 mt-3 pt-3 flex justify-between items-center">
          <span className="text-sm font-semibold text-foreground">Total</span>
          <span className="text-base font-bold text-foreground">CHF 200.00</span>
        </div>
      </div>

      {/* Payment methods */}
      <div className="space-y-2">
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-primary/30 bg-primary/[0.03]">
          <Smartphone className="w-5 h-5 text-foreground/60" />
          <span className="text-sm font-medium text-foreground">TWINT</span>
          <div className="ml-auto w-4 h-4 rounded-full bg-primary flex items-center justify-center">
            <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
          </div>
        </div>
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border/40">
          <CreditCard className="w-5 h-5 text-foreground/40" />
          <span className="text-sm text-foreground/60">Kreditkarte</span>
        </div>
      </div>
    </div>
  </MockupFrame>
);

/* ── Security Mockup ── */
const SecurityMockup = () => (
  <MockupFrame title="Sicherheit">
    <div className="space-y-3">
      {[
        { icon: Lock, label: 'Ende-zu-Ende-Verschlüsselung', desc: 'AHV-Nr., Bankdaten', active: true },
        { icon: ShieldCheck, label: 'Zwei-Faktor-Authentifizierung', desc: 'Aktiviert', active: true },
        { icon: Star, label: 'Passkeys (Face ID)', desc: 'Eingerichtet', active: true },
      ].map((item, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-border/40">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
            <item.icon className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground">{item.label}</p>
            <p className="text-[11px] text-muted-foreground">{item.desc}</p>
          </div>
          <div className="w-8 h-5 rounded-full bg-emerald-500 flex items-center justify-end px-0.5">
            <div className="w-4 h-4 rounded-full bg-white" />
          </div>
        </div>
      ))}
    </div>
  </MockupFrame>
);

/* ── Document Collection Mockup ── */
const DocumentCollectionMockup = () => (
  <MockupFrame title="Dokumentensammlung">
    <div className="space-y-2">
      {/* Search bar */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border/40 bg-muted/20 mb-1">
        <Search className="w-3.5 h-3.5 text-muted-foreground/40" />
        <span className="text-[11px] text-muted-foreground/40">Dokument suchen...</span>
      </div>
      {/* Documents */}
      {[
        { name: 'Lohnausweis_2025.pdf', date: '15. Jan 2026', assigned: true },
        { name: 'Kontoauszug_UBS.pdf', date: '20. Jan 2026', assigned: true },
        { name: 'Krankenkasse_CSS.pdf', date: '02. Feb 2026', assigned: false },
        { name: 'Spende_WWF.pdf', date: '10. Mär 2026', assigned: false },
      ].map((doc, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border/40 hover:bg-muted/20 transition-colors">
          <div className="w-8 h-8 rounded-lg bg-primary/5 border border-primary/10 flex items-center justify-center shrink-0">
            <File className="w-4 h-4 text-primary/60" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground truncate">{doc.name}</p>
            <p className="text-[10px] text-muted-foreground">{doc.date}</p>
          </div>
          {doc.assigned ? (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 shrink-0">Zugewiesen</span>
          ) : (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0">Nicht zugewiesen</span>
          )}
        </div>
      ))}
      {/* Upload button */}
      <div className="flex items-center justify-center gap-2 px-3 py-3 rounded-xl border-2 border-dashed border-primary/20 text-primary/50 mt-1">
        <Upload className="w-4 h-4" />
        <span className="text-xs font-medium">Dokument hinzufügen</span>
      </div>
    </div>
  </MockupFrame>
);

/* ── Checklist Mockup ── */
const ChecklistMockup = () => (
  <MockupFrame title="Dokumenten-Checkliste">
    <div className="space-y-2">
      {[
        { name: 'Lohnausweis', status: 'done' as const },
        { name: 'Bankbelege (Saldo 31.12.)', status: 'done' as const },
        { name: 'Krankenkassen-Prämie', status: 'uploaded' as const },
        { name: 'Säule 3a Bescheinigung', status: 'missing' as const },
        { name: 'Wertschriftenverzeichnis', status: 'missing' as const },
      ].map((item, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border/40">
          {item.status === 'done' ? (
            <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
              <Check className="w-3 h-3 text-white" strokeWidth={3} />
            </div>
          ) : item.status === 'uploaded' ? (
            <div className="w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center shrink-0">
              <Clock className="w-3 h-3 text-white" strokeWidth={2.5} />
            </div>
          ) : (
            <div className="w-5 h-5 rounded-full border-2 border-red-300 shrink-0" />
          )}
          <span className={`text-xs font-medium ${
            item.status === 'missing' ? 'text-foreground/50' : 'text-foreground'
          }`}>{item.name}</span>
          <span className={`ml-auto text-[10px] font-medium px-2 py-0.5 rounded-full ${
            item.status === 'done' ? 'bg-emerald-50 text-emerald-600' :
            item.status === 'uploaded' ? 'bg-amber-50 text-amber-600' :
            'bg-red-50 text-red-500'
          }`}>
            {item.status === 'done' ? 'Zugewiesen' : item.status === 'uploaded' ? 'Hochgeladen' : 'Fehlend'}
          </span>
        </div>
      ))}
    </div>
  </MockupFrame>
);

/* ── Map article IDs to their mockup components ── */
const articleMockups: Record<string, React.FC> = {
  'registration': DashboardMockup,
  'create-tax-year': DashboardMockup,
  'personal-data': FormMockup,
  'income': FormMockup,
  'deductions': FormMockup,
  'document-collection': DocumentCollectionMockup,
  'document-checklist': ChecklistMockup,
  'upload-methods': UploadMockup,
  'submit': PaymentMockup,
  'status': StatusMockup,
  'completed': StatusMockup,
  'pricing': PaymentMockup,
  'security': SecurityMockup,
};

/* ══════ Rich "Introduction to Ditax" article ══════ */
const IntroductionArticle: React.FC<{ categoryTitle: string }> = ({ categoryTitle }) => {
  return (
    <div>
      {/* Breadcrumb */}
      <p className="text-sm text-primary font-medium mb-2">{categoryTitle}</p>
      <h1 className="text-[28px] sm:text-[32px] font-bold text-foreground leading-tight mb-3">
        Willkommen bei Ditax
      </h1>
      <p className="text-base text-muted-foreground leading-relaxed mb-8">
        Deine Steuererklärung – einfach, sicher und von Experten erstellt. Lade deine Dokumente hoch und lehn dich zurück.
      </p>

      {/* Info callout */}
      <div className="rounded-xl border border-primary/15 bg-primary/[0.03] p-4 flex gap-3 mb-10">
        <Info className="w-4 h-4 text-primary mt-0.5 shrink-0" />
        <p className="text-sm text-foreground/70 leading-relaxed">
          Diese Dokumentation erklärt dir Schritt für Schritt, wie du mit Ditax deine Steuererklärung erledigen kannst – von der Registrierung bis zur fertigen Einreichung.
        </p>
      </div>

      {/* ── Dashboard Preview ── */}
      <DashboardMockup />

      {/* ── Overview ── */}
      <h2 className="text-xl font-semibold text-foreground mt-10 mb-3">Übersicht</h2>
      <p className="text-sm text-foreground/70 leading-[1.8] mb-3">
        Ditax nimmt dir die Arbeit ab: Du lädst deine Dokumente hoch, füllst einfache Formulare aus – und unsere zertifizierten Steuerexperten (Treuhänder mit eidg. Fachausweis) erstellen deine komplette Steuererklärung.
      </p>
      <p className="text-sm text-foreground/70 leading-[1.8] mb-8">
        Alle Abzüge werden geprüft und optimiert, damit du garantiert nicht zu viel Steuern zahlst. Verfügbar auf iOS und Android.
      </p>

      {/* ── Key Features ── */}
      <h2 className="text-xl font-semibold text-foreground mt-10 mb-4">Warum Ditax?</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-10">
        {[
          { icon: ShieldCheck, title: 'Echte Experten', desc: 'Zertifizierte Treuhänder erstellen und prüfen deine Steuererklärung individuell.' },
          { icon: TrendingUp, title: 'Maximale Einsparungen', desc: 'Wir holen alle Abzüge raus, die dir zustehen. Garantiert.' },
          { icon: Zap, title: 'In 10 Tagen fertig', desc: 'Mit dem Express-Service erhältst du deine Steuererklärung in nur 10 Arbeitstagen.' },
        ].map((f, i) => (
          <div key={i} className="rounded-xl border border-border/50 p-4 hover:border-border transition-colors">
            <f.icon className="w-5 h-5 text-primary mb-3" strokeWidth={1.5} />
            <p className="text-sm font-semibold text-foreground mb-1">{f.title}</p>
            <p className="text-[13px] text-muted-foreground leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>

      {/* ── How It Works ── */}
      <h2 className="text-xl font-semibold text-foreground mt-10 mb-2">So funktioniert's</h2>
      <p className="text-sm text-muted-foreground mb-6">
        In vier einfachen Schritten zur fertigen Steuererklärung.
      </p>
      <div className="space-y-5 mb-10">
        {[
          { icon: UserPlus, step: '1', title: 'Konto erstellen', desc: 'Registriere dich kostenlos in wenigen Minuten.' },
          { icon: Upload, step: '2', title: 'Dokumente hochladen', desc: 'Lade deine Unterlagen als PDF oder Foto hoch – sicher und verschlüsselt.' },
          { icon: MessageCircle, step: '3', title: 'Angaben erfassen', desc: 'Beantworte einfache Fragen zu Einkommen, Vermögen und Abzügen.' },
          { icon: FileCheck, step: '4', title: 'Steuererklärung erhalten', desc: 'Unsere Experten erstellen deine optimierte Steuererklärung und reichen sie ein.' },
        ].map((s, i) => (
          <div key={i} className="flex gap-4 items-start">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-sm font-bold text-primary">{s.step}</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground mb-0.5">{s.title}</p>
              <p className="text-[13px] text-muted-foreground leading-relaxed">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Status Preview ── */}
      <h2 className="text-xl font-semibold text-foreground mt-10 mb-3">Status-Tracking</h2>
      <p className="text-sm text-foreground/70 leading-[1.8] mb-4">
        Verfolge jederzeit den Fortschritt deiner Steuererklärung – vom Einreichen bis zur Zustellung.
      </p>
      <StatusMockup />

      {/* ── Verfügbarkeit ── */}
      <h2 className="text-xl font-semibold text-foreground mt-10 mb-3">Verfügbarkeit</h2>
      <p className="text-sm text-foreground/70 leading-[1.8] mb-4">
        Ditax ist als App für iOS und Android verfügbar. Lade die App im App Store oder Google Play Store herunter und starte noch heute mit deiner Steuererklärung.
      </p>

      {/* ── Nächste Schritte ── */}
      <h2 className="text-xl font-semibold text-foreground mt-10 mb-3">Nächste Schritte</h2>
      <p className="text-sm text-foreground/70 leading-[1.8] mb-4">
        Bereit loszulegen? Hier findest du die wichtigsten nächsten Schritte:
      </p>
      <div className="space-y-2">
        {[
          { title: 'Konto erstellen', desc: 'Registrierung & Login einrichten' },
          { title: 'Steuerjahr anlegen', desc: 'Dein erstes Steuerjahr starten' },
          { title: 'Dokumente hochladen', desc: 'Deine Unterlagen sicher übermitteln' },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-border/40 hover:border-border/60 transition-colors cursor-default group">
            <ArrowRight className="w-4 h-4 text-primary shrink-0 group-hover:translate-x-0.5 transition-transform" />
            <div>
              <p className="text-sm font-medium text-foreground">{item.title}</p>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
