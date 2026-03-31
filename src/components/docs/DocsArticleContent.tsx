import React from 'react';
import { ShieldCheck, TrendingUp, Zap, UserPlus, Upload, MessageCircle, FileCheck, Info, ArrowRight, Check, Camera, File, Search, CreditCard, Smartphone, Clock, ChevronRight, Star, Lock, Bell, Mail, Key, Fingerprint, Users, Home, Briefcase, Heart, GraduationCap, Building, Car, Bitcoin, Landmark, PiggyBank, FileText, Eye, Trash2, AlertTriangle, CheckCircle2, CircleDot, HelpCircle } from 'lucide-react';
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
  const RichLayout = richArticles[articleId];
  if (RichLayout) {
    return <RichLayout categoryTitle={category.title} />;
  }

  // Fallback: plain markdown (shouldn't happen with full coverage)
  return (
    <div>
      <p className="text-sm text-primary font-medium mb-2">{category.title}</p>
      <h1 className="text-[28px] sm:text-[32px] font-bold text-foreground leading-tight mb-3">{article.title}</h1>
      {article.subtitle && (
        <p className="text-base text-muted-foreground leading-relaxed mb-8">{article.subtitle}</p>
      )}
      <div className="prose prose-sm max-w-none prose-headings:text-foreground prose-p:text-foreground/70 prose-p:leading-[1.75]">
        <ReactMarkdownLazy content={article.content} />
      </div>
    </div>
  );
};

// Lazy markdown wrapper
const ReactMarkdownLazy: React.FC<{ content: string }> = ({ content }) => {
  const [ReactMarkdown, setRM] = React.useState<any>(null);
  React.useEffect(() => { import('react-markdown').then(m => setRM(() => m.default)); }, []);
  if (!ReactMarkdown) return null;
  return <ReactMarkdown>{content}</ReactMarkdown>;
};

/* ══════════════════════════════════════════════════
   Shared Layout Helpers
   ══════════════════════════════════════════════════ */

const ArticleHeader: React.FC<{ categoryTitle: string; title: string; subtitle?: string }> = ({ categoryTitle, title, subtitle }) => (
  <>
    <p className="text-sm text-primary font-medium mb-2">{categoryTitle}</p>
    <h1 className="text-[28px] sm:text-[32px] font-bold text-foreground leading-tight mb-3">{title}</h1>
    {subtitle && <p className="text-base text-muted-foreground leading-relaxed mb-8">{subtitle}</p>}
  </>
);

const TipBox: React.FC<{ children: React.ReactNode; variant?: 'info' | 'tip' | 'warning' }> = ({ children, variant = 'tip' }) => {
  const styles = {
    info: { border: 'border-primary/15', bg: 'bg-primary/[0.03]', icon: Info, iconColor: 'text-primary' },
    tip: { border: 'border-emerald-200', bg: 'bg-emerald-50/50', icon: Zap, iconColor: 'text-emerald-600' },
    warning: { border: 'border-amber-200', bg: 'bg-amber-50/50', icon: AlertTriangle, iconColor: 'text-amber-600' },
  }[variant];
  const Icon = styles.icon;
  return (
    <div className={`rounded-xl border ${styles.border} ${styles.bg} p-4 flex gap-3 my-6`}>
      <Icon className={`w-4 h-4 ${styles.iconColor} mt-0.5 shrink-0`} />
      <div className="text-sm text-foreground/70 leading-relaxed">{children}</div>
    </div>
  );
};

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h2 className="text-xl font-semibold text-foreground mt-10 mb-3">{children}</h2>
);

const Paragraph: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-sm text-foreground/70 leading-[1.8] mb-3">{children}</p>
);

const StepList: React.FC<{ steps: { title: string; desc: string }[] }> = ({ steps }) => (
  <div className="space-y-4 my-6">
    {steps.map((s, i) => (
      <div key={i} className="flex gap-4 items-start">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
          <span className="text-sm font-bold text-primary">{i + 1}</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground mb-0.5">{s.title}</p>
          <p className="text-[13px] text-muted-foreground leading-relaxed">{s.desc}</p>
        </div>
      </div>
    ))}
  </div>
);

const FeatureGrid: React.FC<{ items: { icon: any; title: string; desc: string }[]; cols?: number }> = ({ items, cols = 3 }) => (
  <div className={`grid grid-cols-1 ${cols === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3'} gap-3 my-6`}>
    {items.map((f, i) => (
      <div key={i} className="rounded-xl border border-border/50 p-4 hover:border-border transition-colors">
        <f.icon className="w-5 h-5 text-primary mb-3" strokeWidth={1.5} />
        <p className="text-sm font-semibold text-foreground mb-1">{f.title}</p>
        <p className="text-[13px] text-muted-foreground leading-relaxed">{f.desc}</p>
      </div>
    ))}
  </div>
);

const BulletList: React.FC<{ items: { bold: string; text: string }[] }> = ({ items }) => (
  <div className="space-y-2.5 my-4">
    {items.map((item, i) => (
      <div key={i} className="flex gap-3 items-start">
        <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
        <p className="text-sm text-foreground/70 leading-relaxed">
          <span className="font-semibold text-foreground">{item.bold}</span> – {item.text}
        </p>
      </div>
    ))}
  </div>
);

/* ══════════════════════════════════════════════════
   Mockup Components
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
    <div className="p-4 sm:p-5">{children}</div>
  </div>
);

const DashboardMockup = () => (
  <MockupFrame title="Dashboard">
    <div className="space-y-3">
      <div className="rounded-2xl border border-primary/15 bg-primary/[0.03] p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs text-muted-foreground">Steuerjahr</p>
            <p className="text-lg font-bold text-foreground">2025</p>
          </div>
          <span className="text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full">In Erfassung</span>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-[11px] text-muted-foreground"><span>Fortschritt</span><span>65%</span></div>
          <div className="h-2 bg-muted/50 rounded-full overflow-hidden">
            <div className="h-full w-[65%] bg-gradient-to-r from-primary to-primary/70 rounded-full" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {[{ label: 'Angaben', status: '3/4 erledigt' }, { label: 'Dokumente', status: '5/7 hochgeladen' }].map((item, i) => (
          <div key={i} className="rounded-xl border border-border/40 p-3">
            <p className="text-[11px] text-muted-foreground mb-0.5">{item.label}</p>
            <p className="text-xs font-medium text-amber-600">{item.status}</p>
          </div>
        ))}
      </div>
    </div>
  </MockupFrame>
);

const StatusMockup = () => (
  <MockupFrame title="Status-Tracking">
    <div className="space-y-0">
      {[
        { title: 'Daten eingereicht', status: 'done' as const },
        { title: 'Unterlagen erhalten', status: 'done' as const },
        { title: 'Zahlung bestätigt', status: 'done' as const },
        { title: 'In Bearbeitung', status: 'active' as const, badge: 'Aktuell' },
        { title: 'Qualitätsprüfung', status: 'pending' as const },
        { title: 'Zustellung', status: 'pending' as const },
      ].map((step, i, arr) => (
        <div key={i} className="flex gap-3 relative">
          {i < arr.length - 1 && (
            <div className={`absolute left-[11px] top-[24px] bottom-0 w-[2px] ${
              step.status === 'done' && arr[i+1].status === 'done' ? 'bg-primary' :
              step.status === 'done' && arr[i+1].status === 'active' ? 'bg-gradient-to-b from-primary to-border' :
              'bg-border/40'
            }`} />
          )}
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
          <div className="pb-5">
            <div className="flex items-center gap-2">
              <p className={`text-xs font-medium ${step.status === 'pending' ? 'text-muted-foreground/40' : 'text-foreground'}`}>{step.title}</p>
              {step.badge && (
                <span className="text-[10px] font-medium bg-amber-50 text-amber-600 border border-amber-100 px-2 py-0.5 rounded-full">{step.badge}</span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  </MockupFrame>
);

const PaymentMockup = () => (
  <MockupFrame title="Bezahlung">
    <div className="space-y-3">
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

/* ══════════════════════════════════════════════════
   Rich Article Layouts
   ══════════════════════════════════════════════════ */

type ArticleComponent = React.FC<{ categoryTitle: string }>;

const IntroductionArticle: ArticleComponent = ({ categoryTitle }) => (
  <div>
    <ArticleHeader categoryTitle={categoryTitle} title="Willkommen bei Ditax" subtitle="Deine Steuererklärung – einfach, sicher und von Experten erstellt. Lade deine Dokumente hoch und lehn dich zurück." />

    <TipBox variant="info">
      Diese Dokumentation erklärt dir Schritt für Schritt, wie du mit Ditax deine Steuererklärung erledigen kannst – von der Registrierung bis zur fertigen Einreichung.
    </TipBox>

    <DashboardMockup />

    <SectionTitle>Übersicht</SectionTitle>
    <Paragraph>
      Ditax nimmt dir die Arbeit ab: Du lädst deine Dokumente hoch, füllst einfache Formulare aus – und unsere zertifizierten Steuerexperten (Treuhänder mit eidg. Fachausweis) erstellen deine komplette Steuererklärung.
    </Paragraph>
    <Paragraph>
      Alle Abzüge werden geprüft und optimiert, damit du garantiert nicht zu viel Steuern zahlst. Verfügbar auf iOS und Android.
    </Paragraph>

    <SectionTitle>Warum Ditax?</SectionTitle>
    <FeatureGrid items={[
      { icon: ShieldCheck, title: 'Echte Experten', desc: 'Zertifizierte Treuhänder erstellen und prüfen deine Steuererklärung individuell.' },
      { icon: TrendingUp, title: 'Maximale Einsparungen', desc: 'Wir holen alle Abzüge raus, die dir zustehen. Garantiert.' },
      { icon: Zap, title: 'In 10 Tagen fertig', desc: 'Mit dem Express-Service erhältst du deine Steuererklärung in nur 10 Arbeitstagen.' },
    ]} />

    <SectionTitle>So funktioniert's</SectionTitle>
    <Paragraph>In vier einfachen Schritten zur fertigen Steuererklärung.</Paragraph>
    <StepList steps={[
      { title: 'Konto erstellen', desc: 'Registriere dich kostenlos in wenigen Minuten.' },
      { title: 'Dokumente hochladen', desc: 'Lade deine Unterlagen als PDF oder Foto hoch – sicher und verschlüsselt.' },
      { title: 'Angaben erfassen', desc: 'Beantworte einfache Fragen zu Einkommen, Vermögen und Abzügen.' },
      { title: 'Steuererklärung erhalten', desc: 'Unsere Experten erstellen deine optimierte Steuererklärung und reichen sie ein.' },
    ]} />

    <SectionTitle>Status-Tracking</SectionTitle>
    <Paragraph>Verfolge jederzeit den Fortschritt deiner Steuererklärung – vom Einreichen bis zur Zustellung.</Paragraph>
    <StatusMockup />

    <SectionTitle>Nächste Schritte</SectionTitle>
    <Paragraph>Bereit loszulegen? Hier findest du die wichtigsten nächsten Schritte:</Paragraph>
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

const RegistrationArticle: ArticleComponent = ({ categoryTitle }) => (
  <div>
    <ArticleHeader categoryTitle={categoryTitle} title="Registrierung & Login" subtitle="In wenigen Minuten startklar – sicher und unkompliziert." />

    <SectionTitle>Konto erstellen</SectionTitle>
    <Paragraph>Die Registrierung dauert weniger als 2 Minuten und ist komplett kostenlos.</Paragraph>
    <StepList steps={[
      { title: 'App öffnen', desc: 'Öffne die Ditax App auf deinem Smartphone.' },
      { title: 'Konto erstellen wählen', desc: 'Tippe auf «Konto erstellen» auf dem Startbildschirm.' },
      { title: 'E-Mail & Passwort eingeben', desc: 'Wähle deine alltägliche E-Mail-Adresse – darüber erhältst du alle Updates.' },
      { title: 'E-Mail bestätigen', desc: 'Klicke auf den Bestätigungslink in der zugesendeten E-Mail.' },
    ]} />

    <TipBox>Verwende deine alltägliche E-Mail-Adresse. Darüber erhältst du alle Updates zu deiner Steuererklärung.</TipBox>

    <SectionTitle>Anmelden</SectionTitle>
    <Paragraph>Melde dich mit E-Mail und Passwort an. Optional kannst du Passkeys aktivieren – dann reicht Face ID oder Touch ID zum Einloggen.</Paragraph>

    <FeatureGrid cols={2} items={[
      { icon: Key, title: 'Passwort', desc: 'Klassisch mit E-Mail und Passwort einloggen.' },
      { icon: Fingerprint, title: 'Passkeys', desc: 'Per Face ID oder Touch ID – schnell und sicher.' },
    ]} />

    <SectionTitle>Passwort vergessen?</SectionTitle>
    <Paragraph>Tippe auf «Passwort vergessen» auf dem Login-Bildschirm. Du erhältst eine E-Mail mit einem Link zum Zurücksetzen. Der Link ist 24 Stunden gültig.</Paragraph>
  </div>
);

const CreateTaxYearArticle: ArticleComponent = ({ categoryTitle }) => (
  <div>
    <ArticleHeader categoryTitle={categoryTitle} title="Steuerjahr anlegen" subtitle="Starte dein Steuerjahr und wähle zwischen Standard und Express." />

    <DashboardMockup />

    <SectionTitle>Dein erstes Steuerjahr starten</SectionTitle>
    <Paragraph>Nach dem Login landest du auf dem Dashboard – dem Herzstück der App. Hier siehst du alle deine Steuerjahre auf einen Blick.</Paragraph>

    <StepList steps={[
      { title: 'Steuerjahr hinzufügen', desc: 'Tippe auf «Steuerjahr hinzufügen» auf dem Dashboard.' },
      { title: 'Jahr wählen', desc: 'Wähle das gewünschte Steuerjahr (z.B. 2025).' },
      { title: 'Service wählen', desc: 'Entscheide dich zwischen Standard oder Express.' },
      { title: 'Loslegen', desc: 'Dein Steuerjahr ist bereit – du kannst sofort starten.' },
    ]} />

    <FeatureGrid cols={2} items={[
      { icon: Clock, title: 'Standard', desc: 'Bearbeitungszeit ca. 40–90 Arbeitstage. Der günstigere Service.' },
      { icon: Zap, title: 'Express', desc: 'Bearbeitungszeit ca. 10 Arbeitstage. Ideal wenn die Frist näher rückt.' },
    ]} />

    <SectionTitle>Für die ganze Familie</SectionTitle>
    <Paragraph>Du kannst die Steuererklärung auch für deinen Ehepartner/in oder deine Kinder einreichen. Füge sie einfach unter Profil → Steuerpflichtige Personen hinzu. Bei verheirateten Paaren wird automatisch eine gemeinsame Veranlagung erstellt.</Paragraph>

    <SectionTitle>Mehrere Jahre gleichzeitig</SectionTitle>
    <Paragraph>Musst du noch Steuererklärungen aus Vorjahren nachreichen? Kein Problem – lege einfach mehrere Steuerjahre an. Jedes wird separat auf dem Dashboard angezeigt und kann unabhängig bearbeitet werden.</Paragraph>
  </div>
);

const PersonalDataArticle: ArticleComponent = ({ categoryTitle }) => (
  <div>
    <ArticleHeader categoryTitle={categoryTitle} title="Persönliche Angaben" subtitle="Deine Grunddaten – einmal ausfüllen, bei Wiederkehr automatisch übernommen." />

    <SectionTitle>Was wird abgefragt?</SectionTitle>
    <Paragraph>Im ersten Schritt gibst du deine persönlichen Daten ein. Der Assistent führt dich mit einfachen Fragen Schritt für Schritt durch den Prozess – so ist sichergestellt, dass nichts vergessen geht.</Paragraph>

    <BulletList items={[
      { bold: 'Name und Vorname', text: 'Wie auf deiner ID oder deinem Pass.' },
      { bold: 'Geburtsdatum', text: 'Wird für die korrekte Steuerberechnung benötigt.' },
      { bold: 'Adresse', text: 'Strasse, PLZ und Ort – bestimmt deinen Steuerkanton.' },
      { bold: 'AHV-Nummer', text: 'Findest du auf deinem Lohnausweis oder deiner Krankenkassenkarte.' },
      { bold: 'Zivilstand und Konfession', text: 'Relevant für Tarif und Kirchensteuer.' },
    ]} />

    <TipBox>Halte deinen Lohnausweis und deine AHV-Nummer bereit, bevor du loslegst. So geht es am schnellsten.</TipBox>

    <SectionTitle>Daten aus dem Vorjahr</SectionTitle>
    <Paragraph>Hast du Ditax schon letztes Jahr genutzt? Dann sind deine persönlichen Angaben bereits vorausgefüllt. Du musst nur noch prüfen, ob sich etwas geändert hat – z.B. ein Umzug oder eine Heirat.</Paragraph>
  </div>
);

const IncomeArticle: ArticleComponent = ({ categoryTitle }) => (
  <div>
    <ArticleHeader categoryTitle={categoryTitle} title="Einkommen erfassen" subtitle="Lohn, Nebeneinkünfte, Renten – alles an einem Ort." />

    <SectionTitle>Welche Einkommen gehören hierhin?</SectionTitle>
    <Paragraph>Gib alle Einkommensquellen des Steuerjahres an. Der Assistent fragt dich Schritt für Schritt ab.</Paragraph>

    <BulletList items={[
      { bold: 'Lohn aus Anstellung', text: 'Haupterwerb gemäss Lohnausweis.' },
      { bold: 'Nebeneinkünfte', text: 'Freelancing, Vermietung oder andere Einkünfte.' },
      { bold: 'Renten und Pensionen', text: 'AHV, Pensionskasse, IV-Renten.' },
      { bold: 'Taggelder', text: 'Arbeitslosigkeit, Krankentaggeld, Unfalltaggeld.' },
      { bold: 'Wertschriftenertrag', text: 'Dividenden, Zinsen, Fondsausschüttungen.' },
    ]} />

    <SectionTitle>Lohnausweis hochladen</SectionTitle>
    <Paragraph>Lade deinen Lohnausweis als PDF hoch – Ditax erkennt die wichtigsten Angaben automatisch und füllt die Felder für dich aus. Das spart Zeit und verhindert Tippfehler.</Paragraph>

    <SectionTitle>Mehrere Arbeitgeber</SectionTitle>
    <Paragraph>Hast du den Job gewechselt oder mehrere Arbeitgeber? Erfasse jeden Lohnausweis einzeln. Die App rechnet alles zusammen.</Paragraph>

    <TipBox>Auch kleine Nebeneinkünfte solltest du angeben. Unsere Experten können so alle legalen Abzüge optimal nutzen.</TipBox>
  </div>
);

const AssetsArticle: ArticleComponent = ({ categoryTitle }) => (
  <div>
    <ArticleHeader categoryTitle={categoryTitle} title="Vermögen erfassen" subtitle="Bankkonten, Wertschriften, Immobilien – Stichtag 31. Dezember." />

    <SectionTitle>Was zählt zum Vermögen?</SectionTitle>
    <Paragraph>Erfasse dein gesamtes Vermögen per 31. Dezember des Steuerjahres.</Paragraph>

    <FeatureGrid cols={3} items={[
      { icon: Landmark, title: 'Bankkonten', desc: 'Spar-, Privat- und Lohnkonto (Saldo per 31.12.)' },
      { icon: TrendingUp, title: 'Wertschriften', desc: 'Aktien, Fonds, ETFs, Obligationen' },
      { icon: Building, title: 'Immobilien', desc: 'Eigentumswohnungen, Häuser' },
      { icon: Car, title: 'Fahrzeuge', desc: 'Zeitwert per 31. Dezember' },
      { icon: Bitcoin, title: 'Kryptowährungen', desc: 'Marktwert per 31. Dezember' },
      { icon: PiggyBank, title: 'Lebensversicherungen', desc: 'Rückkaufswert der Police' },
    ]} />

    <SectionTitle>Belege hochladen</SectionTitle>
    <Paragraph>Lade für jedes Konto den Kontoauszug per 31.12. hoch. Je vollständiger deine Belege, desto schneller die Bearbeitung.</Paragraph>

    <SectionTitle>Schulden nicht vergessen</SectionTitle>
    <Paragraph>Hypotheken, Privatkredite und andere Schulden werden vom Vermögen abgezogen und senken deine Vermögenssteuer.</Paragraph>

    <TipBox>Die korrekten Bewertungen für Wertschriften und Kryptowährungen kennen unsere Experten – du musst nur die Bestände angeben.</TipBox>
  </div>
);

const DeductionsArticle: ArticleComponent = ({ categoryTitle }) => (
  <div>
    <ArticleHeader categoryTitle={categoryTitle} title="Abzüge erfassen" subtitle="Hier sparst du Steuern – unsere Experten maximieren jeden Abzug." />

    <TipBox variant="info">
      Abzüge senken dein steuerbares Einkommen. Je mehr du angibst, desto weniger Steuern zahlst du.
    </TipBox>

    <SectionTitle>Welche Abzüge gibt es?</SectionTitle>

    <BulletList items={[
      { bold: 'Berufsauslagen', text: 'Arbeitsweg, Verpflegung, Homeoffice-Pauschale.' },
      { bold: 'Weiterbildung', text: 'Bis CHF 12\'000 pro Jahr abziehbar.' },
      { bold: 'Versicherungsprämien', text: 'Krankenkasse, Unfall-, Haftpflichtversicherung.' },
      { bold: 'Krankheitskosten', text: 'Zahnarzt, Brille, Medikamente (über Selbstbehalt).' },
      { bold: 'Säule 3a', text: 'Bis CHF 7\'056 (Angestellte) bzw. CHF 35\'280 (Selbständige).' },
      { bold: 'Schuldzinsen', text: 'Hypothekarzinsen und weitere Schuldzinsen.' },
      { bold: 'Spenden', text: 'An steuerbefreite Organisationen (ab CHF 100).' },
      { bold: 'Kinderbetreuung', text: 'Krippe, Tagesmutter, Mittagstisch.' },
      { bold: 'Liegenschaftsunterhalt', text: 'Reparaturen, Renovationen an eigenen Immobilien.' },
    ]} />

    <SectionTitle>Belege bereithalten</SectionTitle>
    <Paragraph>Für jeden Abzug brauchst du einen Beleg. Lade die Nachweise direkt als Dokument hoch – so bist du bei einer Prüfung auf der sicheren Seite.</Paragraph>

    <TipBox>
      <strong>Beispiel:</strong> Du hast CHF 7'056 in die Säule 3a einbezahlt? Damit sparst du je nach Kanton <strong>CHF 1'500 bis 3'000</strong> Steuern. Lade einfach die Bescheinigung hoch.
    </TipBox>
  </div>
);

const DocumentCollectionArticle: ArticleComponent = ({ categoryTitle }) => (
  <div>
    <ArticleHeader categoryTitle={categoryTitle} title="Dokumentensammlung" subtitle="Sammle deine Dokumente flexibel – ordne sie später der Checkliste zu." />

    <SectionTitle>Dein zentraler Ablageort</SectionTitle>
    <Paragraph>Die Dokumentensammlung unter «Dokumente» ist dein persönlicher Sammelordner. Hier lädst du alle relevanten Unterlagen hoch – auch wenn du noch nicht genau weisst, wohin sie gehören. So geht garantiert kein Dokument verloren.</Paragraph>

    <SectionTitle>So funktioniert es</SectionTitle>
    <StepList steps={[
      { title: 'Dokumente öffnen', desc: 'Öffne den Bereich «Dokumente» über das Hauptmenü.' },
      { title: 'Dokument hochladen', desc: 'Tippe auf das «+»-Symbol und fotografiere das Dokument oder wähle eine Datei.' },
      { title: 'Sicher gespeichert', desc: 'Das Dokument wird sicher gespeichert und ist jederzeit abrufbar.' },
    ]} />

    <TipBox>Lade Dokumente hoch, sobald du sie erhältst – z.B. den Lohnausweis direkt nach Erhalt im Januar. So hast du am Ende alles beisammen.</TipBox>

    <SectionTitle>Dokumente der Checkliste zuordnen</SectionTitle>
    <Paragraph>Wenn du deine Steuererklärung ausfüllst, zeigt dir die Dokumenten-Checkliste genau, welche Belege benötigt werden.</Paragraph>

    <BulletList items={[
      { bold: 'Direkt zuordnen', text: 'Bereits hochgeladene Dokumente aus der Sammlung zuweisen.' },
      { bold: 'Sofort zuweisen', text: 'Neue Dokumente hochladen und direkt einer Kategorie zuordnen.' },
      { bold: 'Automatische Erkennung', text: 'Die OCR-Funktion ordnet viele Dokumente von selbst zu.' },
    ]} />

    <Paragraph>So trennst du das Sammeln vom Zuordnen – das macht den Prozess entspannter und flexibler.</Paragraph>

    <SectionTitle>Suchen & Filtern</SectionTitle>
    <Paragraph>Nutze die Suchfunktion oben auf der Dokumenten-Seite, um ein bestimmtes Dokument schnell zu finden. Alle Dokumente werden mit Datum und Dateiname angezeigt.</Paragraph>

    <SectionTitle>Vorschau & Löschen</SectionTitle>
    <Paragraph>Tippe auf ein Dokument, um eine Vorschau zu öffnen. Von dort aus kannst du es herunterladen oder bei Bedarf löschen. Gelöschte Dokumente werden endgültig entfernt.</Paragraph>

    <TipBox variant="warning">Dokumente, die bereits der Checkliste zugewiesen sind, solltest du nur löschen, wenn du sie durch eine aktuellere Version ersetzt.</TipBox>
  </div>
);

const DocumentChecklistArticle: ArticleComponent = ({ categoryTitle }) => (
  <div>
    <ArticleHeader categoryTitle={categoryTitle} title="Dokumenten-Checkliste" subtitle="Die Checkliste zeigt dir genau, was noch fehlt – nichts wird vergessen." />

    <SectionTitle>Alles im Blick</SectionTitle>
    <Paragraph>Die intelligente Checkliste analysiert deine Angaben und zeigt dir genau, welche Dokumente du noch brauchst. So stellst du sicher, dass deine Steuererklärung vollständig ist.</Paragraph>

    <SectionTitle>Typische Dokumente</SectionTitle>
    <BulletList items={[
      { bold: 'Lohnausweis', text: 'Erhältst du von deinem Arbeitgeber (meist Januar/Februar).' },
      { bold: 'Bankbelege', text: 'Kontoauszüge per 31.12. (Saldo-Bestätigung).' },
      { bold: 'Wertschriftenverzeichnis', text: 'Depotauszug von deiner Bank.' },
      { bold: 'Krankenkassenprämie', text: 'Jahresabrechnung deiner Versicherung.' },
      { bold: 'Säule 3a Bescheinigung', text: 'Von deiner Vorsorgeeinrichtung oder Bank.' },
      { bold: 'Spendenbescheinigungen', text: 'Für Spenden über CHF 100.' },
    ]} />

    <TipBox>Die meisten Dokumente erhältst du zwischen Januar und März. Lade sie hoch, sobald sie verfügbar sind.</TipBox>

    <SectionTitle>Status auf einen Blick</SectionTitle>
    <Paragraph>Jedes Dokument in der Checkliste zeigt dir seinen aktuellen Status:</Paragraph>

    <div className="space-y-2 my-4">
      {[
        { color: 'bg-red-500', label: 'Fehlend', desc: 'Muss noch hochgeladen werden' },
        { color: 'bg-amber-500', label: 'Hochgeladen', desc: 'Wurde erkannt und zugeordnet' },
        { color: 'bg-emerald-500', label: 'Zugewiesen', desc: 'Alles in Ordnung, Dokument ist bereit' },
      ].map((s, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-border/40">
          <div className={`w-3 h-3 rounded-full ${s.color} shrink-0`} />
          <div>
            <p className="text-sm font-semibold text-foreground">{s.label}</p>
            <p className="text-xs text-muted-foreground">{s.desc}</p>
          </div>
        </div>
      ))}
    </div>

    <Paragraph>Die Checkliste aktualisiert sich automatisch, sobald du ein neues Dokument hochlädst.</Paragraph>
  </div>
);

const UploadMethodsArticle: ArticleComponent = ({ categoryTitle }) => (
  <div>
    <ArticleHeader categoryTitle={categoryTitle} title="Hochladen & Scannen" subtitle="Fotografiere oder lade Dokumente hoch – die App erkennt den Rest." />

    <SectionTitle>So lädst du Dokumente hoch</SectionTitle>
    <Paragraph>Die Ditax App macht den Dokumenten-Upload so einfach wie möglich. Du hast mehrere Optionen:</Paragraph>

    <FeatureGrid cols={2} items={[
      { icon: Camera, title: 'Foto aufnehmen', desc: 'Fotografiere dein Dokument direkt mit der Smartphone-Kamera. Die App optimiert Kontrast und Ausrichtung automatisch.' },
      { icon: File, title: 'Datei auswählen', desc: 'Wähle eine vorhandene Datei von deinem Gerät – ideal für PDFs, die du per E-Mail erhalten hast.' },
    ]} />

    <TipBox>Fotografiere bei guten Lichtverhältnissen und lege das Dokument auf eine dunkle Unterlage für den besten Kontrast.</TipBox>

    <SectionTitle>Automatische Erkennung (OCR)</SectionTitle>
    <Paragraph>Nach dem Upload analysiert Ditax dein Dokument automatisch:</Paragraph>

    <StepList steps={[
      { title: 'Dokumententyp erkennen', desc: 'Lohnausweis, Kontoauszug, Versicherungsnachweis etc.' },
      { title: 'Kategorie zuordnen', desc: 'Das Dokument wird der richtigen Checklisten-Kategorie zugewiesen.' },
      { title: 'Daten extrahieren', desc: 'Wichtige Daten werden ausgelesen und in die Formulare übernommen.' },
    ]} />

    <SectionTitle>Unterstützte Formate</SectionTitle>
    <Paragraph>PDF (empfohlen), JPG, PNG, HEIC, DOC, XLS, CSV, ZIP und TXT – maximal 10 MB pro Datei. PDFs bieten die beste Qualität für die automatische Texterkennung.</Paragraph>
  </div>
);

const SubmitArticle: ArticleComponent = ({ categoryTitle }) => (
  <div>
    <ArticleHeader categoryTitle={categoryTitle} title="Einreichen & Bezahlen" subtitle="Alle Angaben gemacht? Dann ab damit – wir übernehmen den Rest." />

    <SectionTitle>Steuererklärung einreichen</SectionTitle>
    <Paragraph>Wenn alle Angaben erfasst und Dokumente hochgeladen sind, kannst du deine Steuererklärung mit wenigen Klicks einreichen.</Paragraph>

    <StepList steps={[
      { title: 'Fortschritt prüfen', desc: 'Öffne dein Steuerjahr und stelle sicher, dass alle Bereiche auf grün stehen.' },
      { title: 'Bezahlen & Einreichen', desc: 'Tippe auf «Bezahlen & Einreichen» und wähle TWINT oder Kreditkarte.' },
      { title: 'Experten übernehmen', desc: 'Nach erfolgreicher Bezahlung starten unsere Steuerexperten mit der Bearbeitung.' },
    ]} />

    <PaymentMockup />

    <TipBox variant="info">Du kannst deine Angaben auch nach dem Einreichen noch ergänzen, falls unsere Experten Rückfragen haben.</TipBox>

    <SectionTitle>Was passiert nach der Einreichung?</SectionTitle>
    <Paragraph>Unsere eidgenössisch diplomierten Treuhänder nehmen sich deine Steuererklärung vor:</Paragraph>

    <StepList steps={[
      { title: 'Vollständigkeitsprüfung', desc: 'Sind alle Angaben und Belege vorhanden?' },
      { title: 'Optimierung', desc: 'Alle zulässigen Abzüge werden geprüft und maximiert.' },
      { title: 'Erstellung', desc: 'Die offizielle Steuererklärung wird erstellt.' },
      { title: 'Qualitätskontrolle', desc: 'Ein zweiter Experte prüft das Ergebnis.' },
      { title: 'Zustellung', desc: 'Du erhältst die fertige Steuererklärung in der App.' },
    ]} />
  </div>
);

const StatusArticle: ArticleComponent = ({ categoryTitle }) => (
  <div>
    <ArticleHeader categoryTitle={categoryTitle} title="Status verfolgen" subtitle="Jederzeit wissen, wo deine Steuererklärung steht." />

    <SectionTitle>Immer wissen, wo du stehst</SectionTitle>
    <Paragraph>Das Tracking auf deinem Dashboard zeigt dir in Echtzeit den Fortschritt deiner Steuererklärung.</Paragraph>

    <StatusMockup />

    <SectionTitle>Die einzelnen Schritte</SectionTitle>
    <BulletList items={[
      { bold: 'Daten eingereicht', text: 'Deine Angaben und Dokumente sind bei uns eingegangen.' },
      { bold: 'Unterlagen erhalten', text: 'Alle erforderlichen Dokumente sind vollständig.' },
      { bold: 'Zahlung bestätigt', text: 'Deine Zahlung wurde erfolgreich verarbeitet.' },
      { bold: 'In Bearbeitung', text: 'Unsere Treuhänder arbeiten an deiner Steuererklärung.' },
      { bold: 'Qualitätsprüfung', text: 'Ein zweiter Experte prüft das Ergebnis.' },
      { bold: 'Zustellung', text: 'Deine fertige Steuererklärung wird dir zugestellt.' },
    ]} />

    <FeatureGrid cols={2} items={[
      { icon: Clock, title: 'Standard', desc: 'Ca. 40–90 Arbeitstage Bearbeitungszeit.' },
      { icon: Zap, title: 'Express', desc: 'Ca. 10 Arbeitstage Bearbeitungszeit.' },
    ]} />

    <SectionTitle>Benachrichtigungen</SectionTitle>
    <Paragraph>Du wirst bei jeder Statusänderung automatisch benachrichtigt – per Push-Nachricht und E-Mail. So verpasst du nichts.</Paragraph>

    <SectionTitle>Fehlende Unterlagen</SectionTitle>
    <Paragraph>Falls unsere Experten noch etwas brauchen, wirst du direkt in der App benachrichtigt. Fehlende Dokumente kannst du einfach nachreichen.</Paragraph>
  </div>
);

const CompletedArticle: ArticleComponent = ({ categoryTitle }) => (
  <div>
    <ArticleHeader categoryTitle={categoryTitle} title="Fertige Steuererklärung" subtitle="Prüfen, unterschreiben, einreichen – alles digital." />

    <SectionTitle>Deine Steuererklärung ist fertig</SectionTitle>
    <Paragraph>Sobald unsere Experten fertig sind, wirst du per Push-Nachricht und E-Mail benachrichtigt.</Paragraph>

    <StepList steps={[
      { title: 'Steuererklärung öffnen', desc: 'Öffne die fertige Steuererklärung auf deinem Dashboard.' },
      { title: 'PDF prüfen', desc: 'Überprüfe alle Angaben im erstellten Dokument.' },
      { title: 'Digital unterschreiben', desc: 'Unterschreibe rechtsgültig und unkompliziert direkt in der App.' },
      { title: 'Einreichung beim Steueramt', desc: 'Die Steuererklärung wird automatisch eingereicht.' },
    ]} />

    <TipBox variant="info">Die digitale Unterschrift ist in allen Kantonen rechtsgültig. Du musst nichts ausdrucken oder per Post versenden.</TipBox>

    <SectionTitle>Download & Archiv</SectionTitle>
    <Paragraph>Du kannst deine fertige Steuererklärung jederzeit als PDF herunterladen und auf deinem Gerät speichern. Alle Steuererklärungen bleiben auch in der App gespeichert – du hast jederzeit Zugriff auf vergangene Jahre.</Paragraph>

    <SectionTitle>Einspruch bei der Veranlagung</SectionTitle>
    <Paragraph>Nicht einverstanden mit der definitiven Veranlagung des Steueramts? Lade die Veranlagung hoch und unsere Experten prüfen, ob ein Einspruch sinnvoll ist.</Paragraph>
  </div>
);

const PricingArticle: ArticleComponent = ({ categoryTitle }) => (
  <div>
    <ArticleHeader categoryTitle={categoryTitle} title="Preise & Services" subtitle="Transparente Preise ohne versteckte Kosten." />

    <SectionTitle>Transparente Preise</SectionTitle>
    <Paragraph>Bei Ditax zahlst du einen fairen Preis für eine professionelle Steuererklärung – erstellt von echten Experten, nicht von einer Software.</Paragraph>

    <FeatureGrid cols={2} items={[
      { icon: Clock, title: 'Standard – ab CHF 150', desc: 'Ca. 40–90 Arbeitstage. Professionelle Erstellung durch zertifizierte Treuhänder.' },
      { icon: Zap, title: 'Express – Aufpreis', desc: 'Ca. 10 Arbeitstage. Prioritäre Bearbeitung, ideal wenn die Frist drängt.' },
    ]} />

    <TipBox>Der Express-Service lohnt sich besonders, wenn du deine Steuererklärung schnell brauchst – z.B. weil die Einreichfrist näher rückt.</TipBox>

    <SectionTitle>Im Preis enthalten</SectionTitle>
    <BulletList items={[
      { bold: 'Professionelle Erstellung', text: 'Durch Treuhänder mit eidg. Fachausweis.' },
      { bold: 'Maximale Optimierung', text: 'Alle zulässigen Abzüge werden geprüft.' },
      { bold: 'Digitale Einreichung', text: 'Direkt beim Steueramt eingereicht.' },
      { bold: 'Support bei Rückfragen', text: 'Unterstützung bei Fragen des Steueramts.' },
      { bold: 'Sichere Aufbewahrung', text: 'Digitale Archivierung deiner Dokumente.' },
    ]} />
  </div>
);

const PaymentMethodsArticle: ArticleComponent = ({ categoryTitle }) => (
  <div>
    <ArticleHeader categoryTitle={categoryTitle} title="Zahlungsmethoden" subtitle="Bezahle bequem mit TWINT oder Kreditkarte." />

    <PaymentMockup />

    <SectionTitle>Zahlungsoptionen</SectionTitle>

    <FeatureGrid cols={2} items={[
      { icon: Smartphone, title: 'TWINT', desc: 'Die beliebteste Zahlungsmethode der Schweiz. Scanne den QR-Code oder nutze die App-Integration.' },
      { icon: CreditCard, title: 'Kreditkarte', desc: 'Visa, Mastercard und weitere. Sichere Abwicklung über Stripe.' },
    ]} />

    <SectionTitle>Zahlungssicherheit</SectionTitle>
    <Paragraph>Alle Zahlungen werden verschlüsselt und über zertifizierte Zahlungsanbieter abgewickelt. Ditax speichert keine Kreditkartendaten – deine Zahlungsinformationen sind zu jeder Zeit geschützt.</Paragraph>

    <TipBox variant="info">Nach erfolgreicher Zahlung erhältst du eine Bestätigung per E-Mail und in der App. Die Bearbeitung startet sofort.</TipBox>
  </div>
);

const SecurityArticle: ArticleComponent = ({ categoryTitle }) => (
  <div>
    <ArticleHeader categoryTitle={categoryTitle} title="Datensicherheit" subtitle="Bankensichere Verschlüsselung für deine sensibelsten Daten." />

    <SectionTitle>Deine Daten sind sicher</SectionTitle>
    <Paragraph>Steuerdaten sind hochsensibel. Bei Ditax hat Datenschutz deshalb höchste Priorität.</Paragraph>

    <FeatureGrid cols={3} items={[
      { icon: Lock, title: 'Verschlüsselt', desc: 'Sensible Daten wie AHV-Nummer und Bankdaten sind zusätzlich verschlüsselt.' },
      { icon: ShieldCheck, title: 'Schweiz & EU', desc: 'Alle Daten werden in der Schweiz und/oder EU gespeichert.' },
      { icon: FileCheck, title: 'DSGVO & nDSG', desc: 'Vollständig konform mit europäischem und Schweizer Datenschutzrecht.' },
    ]} />

    <SectionTitle>Dein Konto schützen</SectionTitle>
    <Paragraph>Für zusätzlichen Schutz empfehlen wir dir eine der folgenden Optionen:</Paragraph>

    <FeatureGrid cols={2} items={[
      { icon: Fingerprint, title: 'Passkeys', desc: 'Logge dich per Face ID oder Touch ID ein – ohne Passwort. Schnell und sicher.' },
      { icon: Key, title: 'Zwei-Faktor (2FA)', desc: 'Aktiviere unter Profil → Sicherheit einen zusätzlichen Code beim Login.' },
    ]} />

    <TipBox>Aktiviere mindestens eine der beiden Optionen für den bestmöglichen Schutz deines Kontos.</TipBox>
  </div>
);

const ProfileArticle: ArticleComponent = ({ categoryTitle }) => (
  <div>
    <ArticleHeader categoryTitle={categoryTitle} title="Profil verwalten" subtitle="Deine Einstellungen, steuerpflichtige Personen und mehr." />

    <SectionTitle>Persönliche Daten</SectionTitle>
    <Paragraph>Unter Profil verwaltest du deine Kontodetails und persönlichen Einstellungen.</Paragraph>

    <BulletList items={[
      { bold: 'Name & E-Mail', text: 'Deine Kontaktdaten ändern.' },
      { bold: 'Profilbild', text: 'Lade ein persönliches Profilbild hoch.' },
      { bold: 'Adresse', text: 'Halte deine Adresse aktuell für den korrekten Steuerkanton.' },
    ]} />

    <SectionTitle>Steuerpflichtige Personen</SectionTitle>
    <Paragraph>Hier verwaltest du alle Personen, für die du Steuererklärungen einreichst.</Paragraph>

    <BulletList items={[
      { bold: 'Ehepartner/in', text: 'Für die gemeinsame Veranlagung (bei Verheirateten Pflicht).' },
      { bold: 'Kinder', text: 'Für Kinderzulagen und Kinderabzüge relevant.' },
      { bold: 'Weitere Personen', text: 'Z.B. Personen mit Vollmacht.' },
    ]} />

    <TipBox>Füge steuerpflichtige Personen am besten vor dem Anlegen des Steuerjahres hinzu, damit die Formulare direkt korrekt vorbereitet werden.</TipBox>

    <SectionTitle>Benachrichtigungen</SectionTitle>
    <Paragraph>Stelle ein, wie du über Statusänderungen informiert werden möchtest – per Push-Nachricht, E-Mail oder beides.</Paragraph>

    <SectionTitle>Konto löschen</SectionTitle>
    <Paragraph>Unter Profil → Konto löschen kannst du dein Konto und alle zugehörigen Daten unwiderruflich löschen. Offene Steuererklärungen müssen vorher abgeschlossen sein.</Paragraph>
  </div>
);

const FaqArticle: ArticleComponent = ({ categoryTitle }) => (
  <div>
    <ArticleHeader categoryTitle={categoryTitle} title="Häufige Fragen" subtitle="Antworten auf die wichtigsten Fragen rund um Ditax." />

    {[
      { q: 'Wer erstellt meine Steuererklärung?', a: 'Deine Steuererklärung wird von eidgenössisch diplomierten Treuhändern erstellt – keine automatisierte Software-Lösung, sondern echte Experten, die deine Situation individuell beurteilen.' },
      { q: 'Wie lange dauert die Bearbeitung?', a: 'Standard-Service: ca. 40–90 Arbeitstage. Express-Service: ca. 10 Arbeitstage. Die Bearbeitungszeit beginnt nach vollständiger Einreichung.' },
      { q: 'Kann ich Daten aus dem Vorjahr übernehmen?', a: 'Ja! Wenn du Ditax bereits genutzt hast, werden deine persönlichen Daten automatisch vorausgefüllt. Du musst nur prüfen, ob sich etwas geändert hat.' },
      { q: 'Was passiert, wenn mir Dokumente fehlen?', a: 'Kein Stress – starte trotzdem mit der Erfassung. Fehlende Dokumente kannst du jederzeit nachreichen. Falls unsere Experten etwas vermissen, wirst du in der App benachrichtigt.' },
      { q: 'Ist Ditax für alle Kantone verfügbar?', a: 'Ditax ist für die meisten Schweizer Kantone verfügbar. Kontaktiere uns für Details zur Verfügbarkeit in deinem Kanton.' },
      { q: 'Wie erreiche ich den Support?', a: 'Nutze den Chat in der App oder schreibe uns eine E-Mail. Unser Support-Team antwortet in der Regel innerhalb eines Arbeitstages.' },
      { q: 'Was kostet Ditax?', a: 'Ab CHF 150 pro Steuererklärung. Der genaue Preis hängt von der Komplexität ab. Es gibt keine versteckten Kosten.' },
    ].map((item, i) => (
      <div key={i} className="border-b border-border/30 py-5 first:pt-0 last:border-b-0">
        <h3 className="text-sm font-semibold text-foreground mb-2 flex items-start gap-2">
          <HelpCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          {item.q}
        </h3>
        <p className="text-sm text-foreground/70 leading-relaxed pl-6">{item.a}</p>
      </div>
    ))}
  </div>
);

/* ══════════════════════════════════════════════════
   Article ID → Component Map
   ══════════════════════════════════════════════════ */

const richArticles: Record<string, ArticleComponent> = {
  'introduction': IntroductionArticle,
  'registration': RegistrationArticle,
  'create-tax-year': CreateTaxYearArticle,
  'personal-data': PersonalDataArticle,
  'income': IncomeArticle,
  'assets': AssetsArticle,
  'deductions': DeductionsArticle,
  'document-collection': DocumentCollectionArticle,
  'document-checklist': DocumentChecklistArticle,
  'upload-methods': UploadMethodsArticle,
  'submit': SubmitArticle,
  'status': StatusArticle,
  'completed': CompletedArticle,
  'pricing': PricingArticle,
  'payment-methods': PaymentMethodsArticle,
  'security': SecurityArticle,
  'profile': ProfileArticle,
  'faq': FaqArticle,
};
