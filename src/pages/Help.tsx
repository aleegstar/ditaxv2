import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Sparkles, Menu, X, ChevronRight, ChevronLeft } from 'lucide-react';
import { DocsSidebar } from '@/components/docs/DocsSidebar';
import { DocsArticleContent } from '@/components/docs/DocsArticleContent';
import { DocsChatBot } from '@/components/docs/DocsChatBot';
import { docsCategories, getAllArticles } from '@/components/docs/DocsContent';

const Help = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [selectedArticle, setSelectedArticle] = useState<{ articleId: string; categoryId: string }>({
    articleId: 'registration',
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

  // Find current & next article for navigation
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
      {/* Top Bar */}
      <header className="border-b border-border/60 bg-background/95 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center h-14 gap-4">
          {/* Mobile menu toggle */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-muted transition-colors"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Back button */}
          <button
            onClick={() => navigate(-1)}
            className="hidden sm:flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Zurück
          </button>

          {/* Logo / Title */}
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-b from-[hsl(var(--primary))] to-[hsl(221,100%,42%)] flex items-center justify-center">
              <span className="text-white text-xs font-bold">D</span>
            </div>
            <span className="font-semibold text-foreground text-sm hidden sm:inline">ditax</span>
          </div>

          {/* Nav tabs */}
          <nav className="hidden md:flex items-center gap-1 ml-4">
            <span className="text-sm font-medium text-primary px-3 py-1.5 bg-primary/5 rounded-lg">
              Dokumentation
            </span>
          </nav>

          <div className="flex-1" />

          {/* Search */}
          <div className="relative max-w-xs flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Suchen..."
              className="w-full h-8 pl-9 pr-3 rounded-lg bg-muted/50 border border-border/40 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all placeholder:text-muted-foreground/50"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2">
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            )}
          </div>

          {/* Ask AI button */}
          <button
            onClick={() => setChatOpen(true)}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border/40 bg-background hover:bg-muted/50 text-sm font-medium transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">KI fragen</span>
          </button>
        </div>
      </header>

      <div className="flex-1 flex max-w-7xl mx-auto w-full">
        {/* Sidebar overlay on mobile */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/20 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Left Sidebar */}
        <aside
          className={`
            fixed lg:sticky top-14 left-0 z-40 lg:z-auto
            w-64 h-[calc(100vh-3.5rem)] overflow-y-auto
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
        <main className="flex-1 min-w-0 px-6 sm:px-10 lg:px-16 py-8 pb-24">
          {/* Search results overlay */}
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
              <div className="mt-12 pt-6 border-t border-border/40 flex items-center justify-between">
                {prevArticle ? (
                  <button
                    onClick={() => handleSelectArticle(prevArticle.articleId, prevArticle.categoryId)}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <div className="text-left">
                      <p className="text-[11px] text-muted-foreground/70">Zurück</p>
                      <p className="font-medium">{prevArticle.title}</p>
                    </div>
                  </button>
                ) : <div />}
                {nextArticle ? (
                  <button
                    onClick={() => handleSelectArticle(nextArticle.articleId, nextArticle.categoryId)}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors text-right"
                  >
                    <div>
                      <p className="text-[11px] text-muted-foreground/70">Weiter</p>
                      <p className="font-medium">{nextArticle.title}</p>
                    </div>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : <div />}
              </div>

              {/* Footer */}
              <div className="mt-8 pt-6 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground/60">
                <span>DiTax Dokumentation</span>
              </div>
            </>
          )}
        </main>
      </div>

      {/* Chat Bot */}
      <DocsChatBot open={chatOpen} onOpenChange={setChatOpen} />
    </div>
  );
};

export default Help;
