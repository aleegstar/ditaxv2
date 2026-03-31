import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Sparkles, Menu, X, ChevronRight, ChevronLeft } from 'lucide-react';
import ditaxLogo from '@/assets/ditax-logo-full.png';
import { DocsSidebar } from '@/components/docs/DocsSidebar';
import { DocsArticleContent } from '@/components/docs/DocsArticleContent';
import { DocsChatBot } from '@/components/docs/DocsChatBot';
import { docsCategories, getAllArticles } from '@/components/docs/DocsContent';

const Help = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [selectedArticle, setSelectedArticle] = useState<{ articleId: string; categoryId: string }>({
    articleId: 'introduction',
    categoryId: 'getting-started',
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  const allArticles = useMemo(() => getAllArticles(), []);

  const filteredResults = useMemo(() => {
    if (!search.trim()) return null;
    const q = search.toLowerCase();
    return allArticles.filter(
      a =>
        a.title.toLowerCase().includes(q) ||
        a.content.toLowerCase().includes(q) ||
        a.keywords.some(k => k.includes(q))
    );
  }, [search, allArticles]);

  const handleSelectArticle = (articleId: string, categoryId: string) => {
    setSelectedArticle({ articleId, categoryId });
    setSearch('');
    setSidebarOpen(false);
  };

  // Flat article list for prev/next
  const flatArticles = useMemo(() => {
    return docsCategories.flatMap(cat =>
      cat.articles.map(a => ({ articleId: a.id, categoryId: cat.id, title: a.title, categoryTitle: cat.title }))
    );
  }, []);

  const currentIndex = flatArticles.findIndex(
    a => a.articleId === selectedArticle.articleId && a.categoryId === selectedArticle.categoryId
  );
  const prevArticle = currentIndex > 0 ? flatArticles[currentIndex - 1] : null;
  const nextArticle = currentIndex < flatArticles.length - 1 ? flatArticles[currentIndex + 1] : null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ══════ Top Header Bar ══════ */}
      <header className="border-b border-border/50 bg-background sticky top-0 z-50">
        {/* Row 1: Logo — Search — Ask AI */}
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 flex items-center h-14 gap-4">
          {/* Mobile menu */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-muted transition-colors"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Logo */}
          <button onClick={() => navigate('/')} className="flex items-center gap-2 shrink-0">
            <img src={ditaxLogo} alt="DiTax" className="w-8 h-8" />
            <span className="font-bold text-foreground text-[17px] tracking-tight">ditax</span>
          </button>

          <div className="flex-1" />

          {/* Search */}
          <div className="relative w-52 sm:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search"
              className="w-full h-10 pl-10 pr-16 rounded-lg border border-border/50 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all placeholder:text-muted-foreground/40 bg-background"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground/50 border border-border/50 rounded px-1.5 py-0.5 font-medium">
              Ctrl+K
            </span>
          </div>

          {/* Ask AI */}
          <button
            onClick={() => setChatOpen(true)}
            className="flex items-center gap-2 h-10 px-4 rounded-lg border border-border/50 bg-background hover:bg-muted/40 text-sm font-medium transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            <span className="hidden sm:inline">Ask AI</span>
          </button>
        </div>

        {/* Row 2: Navigation tabs */}
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6">
          <nav className="flex items-center gap-6 -mb-px">
            <span className="text-sm font-medium text-primary border-b-2 border-primary pb-2.5 pt-1 cursor-default">
              Documentation
            </span>
            <button
              onClick={() => navigate('/chat')}
              className="text-sm text-muted-foreground hover:text-foreground pb-2.5 pt-1 transition-colors border-b-2 border-transparent"
            >
              Help Center
            </button>
            <span className="text-sm text-muted-foreground pb-2.5 pt-1 border-b-2 border-transparent cursor-default">
              Changelog
            </span>
          </nav>
        </div>
      </header>

      {/* ══════ Body ══════ */}
      <div className="flex-1 flex max-w-[1400px] mx-auto w-full">
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/20 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Left Sidebar */}
        <aside
          className={`
            fixed lg:sticky top-14 left-0 z-40 lg:z-auto
            w-60 h-[calc(100vh-3.5rem)] overflow-y-auto
            border-r border-border/40 bg-background
            transition-transform duration-200 ease-in-out
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            shrink-0
          `}
        >
          <DocsSidebar
            selectedArticleId={selectedArticle.articleId}
            selectedCategoryId={selectedArticle.categoryId}
            onSelectArticle={handleSelectArticle}
          />
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0 px-6 sm:px-10 lg:px-16 py-8 pb-24 max-w-3xl">
          {/* Search results */}
          {filteredResults !== null ? (
            <div>
              <p className="text-xs text-muted-foreground mb-4">
                {filteredResults.length} Ergebnis{filteredResults.length !== 1 ? 'se' : ''} gefunden
              </p>
              {filteredResults.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-sm text-muted-foreground">Keine Ergebnisse gefunden.</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Versuche einen anderen Suchbegriff oder frage die KI.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredResults.map((article) => (
                    <button
                      key={article.id}
                      onClick={() => handleSelectArticle(article.id, article.categoryId)}
                      className="w-full text-left rounded-xl border border-border/40 p-4 hover:bg-muted/30 transition-colors group"
                    >
                      <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{article.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{article.categoryTitle}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              <DocsArticleContent
                articleId={selectedArticle.articleId}
                categoryId={selectedArticle.categoryId}
              />

              {/* Prev / Next Navigation */}
              <div className="mt-14 pt-6 border-t border-border/40 flex items-center justify-between gap-4">
                {prevArticle ? (
                  <button
                    onClick={() => handleSelectArticle(prevArticle.articleId, prevArticle.categoryId)}
                    className="flex items-center gap-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors group"
                  >
                    <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                    <div className="text-left">
                      <p className="text-[11px] text-muted-foreground/60 mb-0.5">Zurück</p>
                      <p className="font-medium text-foreground">{prevArticle.title}</p>
                    </div>
                  </button>
                ) : <div />}
                {nextArticle ? (
                  <button
                    onClick={() => handleSelectArticle(nextArticle.articleId, nextArticle.categoryId)}
                    className="flex items-center gap-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors text-right ml-auto group"
                  >
                    <div>
                      <p className="text-[11px] text-muted-foreground/60 mb-0.5">Weiter</p>
                      <p className="font-medium text-foreground">{nextArticle.title}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                ) : <div />}
              </div>

              {/* Footer */}
              <div className="mt-8 pt-6 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground/50">
                <span>DiTax Dokumentation</span>
              </div>
            </>
          )}
        </main>

        {/* Right sidebar - Table of Contents (desktop only) */}
        <aside className="hidden xl:block w-52 shrink-0 sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto py-8 pr-4">
          <DocsTableOfContents
            articleId={selectedArticle.articleId}
            categoryId={selectedArticle.categoryId}
          />
        </aside>
      </div>

      {/* Chat Bot */}
      <DocsChatBot open={chatOpen} onOpenChange={setChatOpen} />
    </div>
  );
};

/* ── Right-side "On this page" TOC ── */
const DocsTableOfContents: React.FC<{ articleId: string; categoryId: string }> = ({ articleId, categoryId }) => {
  const category = docsCategories.find(c => c.id === categoryId);
  const article = category?.articles.find(a => a.id === articleId);
  if (!article) return null;

  // Extract ## and ### headings from markdown
  const headings = article.content
    .split('\n')
    .filter(line => /^#{2,3}\s/.test(line))
    .map(line => {
      const level = line.startsWith('###') ? 3 : 2;
      const text = line.replace(/^#{2,3}\s+/, '');
      return { level, text };
    });

  if (headings.length === 0) return null;

  return (
    <div>
      <p className="text-xs font-semibold text-foreground/70 mb-3 flex items-center gap-1.5">
        <span className="text-muted-foreground">📋</span> Auf dieser Seite
      </p>
      <div className="space-y-1 border-l-2 border-border/30 ml-0.5">
        {headings.map((h, i) => (
          <p
            key={i}
            className={`text-[13px] leading-snug transition-colors cursor-default ${
              h.level === 3 ? 'pl-5 text-muted-foreground/60' : 'pl-3 text-muted-foreground hover:text-foreground'
            } ${i === 0 ? 'font-medium text-foreground' : ''}`}
          >
            {h.text}
          </p>
        ))}
      </div>
    </div>
  );
};

export default Help;
