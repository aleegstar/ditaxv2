import React from 'react';
import ReactMarkdown from 'react-markdown';
import { ShieldCheck, TrendingUp, Zap, UserPlus, Upload, MessageCircle, FileCheck, Info, ArrowRight } from 'lucide-react';
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

      {/* ── Overview ── */}
      <h2 className="text-xl font-semibold text-foreground mt-10 mb-3">Übersicht</h2>
      <p className="text-sm text-foreground/70 leading-[1.8] mb-3">
        Ditax nimmt dir die Arbeit ab: Du lädst deine Dokumente hoch, füllst vier einfache Formulare aus – und unsere zertifizierten Steuerexperten (Treuhänder mit eidg. Fachausweis) erstellen deine komplette Steuererklärung.
      </p>
      <p className="text-sm text-foreground/70 leading-[1.8] mb-8">
        Alle Abzüge werden geprüft und optimiert, damit du garantiert nicht zu viel Steuern zahlst. Verfügbar auf iOS und Android.
      </p>

      {/* ── Key Features ── */}
      <h2 className="text-xl font-semibold text-foreground mt-10 mb-4">Warum Ditax?</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-10">
        {[
          { icon: ShieldCheck, title: 'Echte Experten', desc: 'Zertifizierte Treuhänder erstellen und prüfen deine Steuererklärung – keine Software-Automatik.' },
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
