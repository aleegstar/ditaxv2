import React from 'react';
import ReactMarkdown from 'react-markdown';
import { ShieldCheck, TrendingUp, Zap, UserPlus, Upload, MessageCircle, FileCheck, Info } from 'lucide-react';
import { docsCategories } from './DocsContent';

interface DocsArticleContentProps {
  articleId: string;
  categoryId: string;
}

export const DocsArticleContent: React.FC<DocsArticleContentProps> = ({ articleId, categoryId }) => {
  const category = docsCategories.find(c => c.id === categoryId);
  const article = category?.articles.find(a => a.id === articleId);

  if (!article || !category) return null;

  // Check if this is the introduction article – render rich layout
  if (articleId === 'introduction' && categoryId === 'getting-started') {
    return <IntroductionArticle categoryTitle={category.title} />;
  }

  return (
    <div>
      {/* Breadcrumb */}
      <p className="text-sm text-primary font-medium mb-2">{category.title}</p>
      <h1 className="text-[28px] sm:text-[32px] font-bold text-foreground leading-tight mb-3">{article.title}</h1>

      {/* Subtitle from first paragraph if exists */}
      {article.subtitle && (
        <p className="text-base text-muted-foreground leading-relaxed mb-8">{article.subtitle}</p>
      )}

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
      ">
        <ReactMarkdown>{article.content}</ReactMarkdown>
      </div>
    </div>
  );
};

/* ══════ Rich "Introduction to Ditax" article ══════ */
const IntroductionArticle: React.FC<{ categoryTitle: string }> = ({ categoryTitle }) => {
  return (
    <div>
      {/* Breadcrumb */}
      <p className="text-sm text-primary font-medium mb-2">{categoryTitle}</p>
      <h1 className="text-[28px] sm:text-[32px] font-bold text-foreground leading-tight mb-3">
        Einführung in DiTax
      </h1>
      <p className="text-base text-muted-foreground leading-relaxed mb-8">
        Entdecke DiTax, die mobile App die Schweizer Steuererklärungen vereinfacht – mit Experten-Unterstützung, sicherem Dokumenten-Upload und optimierten Abzügen.
      </p>

      {/* Info callout */}
      <div className="rounded-xl border border-primary/15 bg-primary/[0.03] p-4 flex gap-3 mb-10">
        <Info className="w-4 h-4 text-primary mt-0.5 shrink-0" />
        <p className="text-sm text-foreground/70 leading-relaxed">
          Diese Dokumentation hilft dir, alle Funktionen von DiTax zu verstehen. Von der Registrierung bis zur fertigen Steuererklärung – hier findest du alle Informationen.
        </p>
      </div>

      {/* ── Overview ── */}
      <h2 className="text-xl font-semibold text-foreground mt-10 mb-3">Übersicht</h2>
      <p className="text-sm text-foreground/70 leading-[1.8] mb-3">
        DiTax ist eine mobile App für Schweizer Einwohner, die Steuererklärungen vereinfacht. Du lädst deine Dokumente sicher hoch, und zertifizierte Steuerexperten (Treuhänder mit eidg. Fachausweis) erstellen deine Steuererklärung – mit maximalen Abzügen und Expertenprüfung.
      </p>
      <p className="text-sm text-foreground/70 leading-[1.8] mb-3">
        Verfügbar auf iOS und Android, garantiert DiTax maximale Einsparungen, professionelle Prüfung und Lieferung in nur 10 Arbeitstagen mit dem Express-Service.
      </p>
      <p className="text-sm text-foreground/70 leading-[1.8] mb-8">
        DiTax eignet sich besonders für Personen in Kantonen wie Zürich und Aargau und bietet eine intuitive In-App-Erfahrung mit Chat-Support, organisierter Dokumentensammlung und vier einfachen Formularen.
      </p>

      {/* ── Key Features ── */}
      <h2 className="text-xl font-semibold text-foreground mt-10 mb-4">Hauptfunktionen</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-10">
        {[
          { icon: ShieldCheck, title: 'Experten-Prüfung', desc: 'Zertifizierte Treuhänder prüfen alles auf Richtigkeit und Compliance.' },
          { icon: TrendingUp, title: 'Maximale Abzüge', desc: 'Optimierte Steuererklärungen garantieren alle Abzüge die dir zustehen.' },
          { icon: Zap, title: 'Schneller Service', desc: 'Express-Bearbeitung erledigt deine Steuererklärung in 10 Arbeitstagen.' },
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
        Folge diesen vier einfachen Schritten, um deine Steuererklärung von Experten erstellen zu lassen.
      </p>
      <div className="space-y-6 mb-10">
        {[
          { icon: UserPlus, title: 'Registrieren', desc: 'Erstelle dein Konto in wenigen Minuten. Nur grundlegende Kontaktdaten nötig.' },
          { icon: Upload, title: 'Dokumente hochladen', desc: 'Lade Lohnausweise, Bankbelege und Quittungen sicher als PDF oder Foto hoch.' },
          { icon: MessageCircle, title: 'Chat für Hilfe', desc: 'Nutze den In-App-Chat mit KI oder unseren Experten für Fragen.' },
          { icon: FileCheck, title: 'Steuererklärung erhalten', desc: 'Fülle vier Formulare aus (Kontakt, Einkommen, Vermögen, Abzüge) und erhalte deine optimierte Steuererklärung.' },
        ].map((step, i) => (
          <div key={i} className="flex gap-4">
            <div className="w-8 h-8 rounded-lg bg-muted/60 flex items-center justify-center shrink-0 mt-0.5">
              <step.icon className="w-4 h-4 text-foreground/60" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground mb-0.5">{step.title}</p>
              <p className="text-[13px] text-muted-foreground leading-relaxed">{step.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Social proof callout ── */}
      <div className="rounded-xl bg-primary/[0.04] border border-primary/10 p-4 flex gap-3 mb-10">
        <span className="text-base mt-0.5">💡</span>
        <p className="text-sm text-primary font-medium leading-relaxed">
          Über 200 zufriedene Kunden in Aargau und darüber hinaus vertrauen DiTax für eine stressfreie Steuererklärung.
        </p>
      </div>

      {/* ── App Availability ── */}
      <h2 className="text-xl font-semibold text-foreground mt-10 mb-3">Verfügbarkeit</h2>
      <p className="text-sm text-foreground/70 leading-[1.8] mb-3">
        Lade DiTax auf deiner bevorzugten Plattform herunter.
      </p>
      <div className="flex gap-2 mb-3">
        <span className="text-sm font-medium text-primary border-b-2 border-primary pb-1 px-1">iOS</span>
        <span className="text-sm text-muted-foreground px-1 pb-1">Android</span>
      </div>
      <p className="text-sm text-foreground/70 mb-1">Lade die App aus dem App Store herunter.</p>
      <a href="#" className="text-sm font-semibold text-foreground underline underline-offset-2">Im App Store herunterladen</a>

      {/* ── FAQ ── */}
      <h2 className="text-xl font-semibold text-foreground mt-12 mb-4">Häufig gestellte Fragen</h2>
      <div className="space-y-4">
        {[
          {
            q: 'Brauche ich separate Erklärungen für Multi-Kanton-Liegenschaften?',
            a: 'Ja, bei Liegenschaften in verschiedenen Kantonen wie Zürich und Aargau müssen in der Regel separate Steuererklärungen eingereicht werden. DiTax-Experten kümmern sich darum.',
          },
          {
            q: 'Welche Dateiformate werden unterstützt?',
            a: 'PDF, JPG, PNG, DOC, XLS, CSV, ZIP, TXT und HEIC-Dateien können sicher hochgeladen werden.',
          },
        ].map((faq, i) => (
          <div key={i}>
            <p className="text-base font-semibold text-foreground mb-1.5">{faq.q}</p>
            <p className="text-sm text-foreground/70 leading-relaxed">{faq.a}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
