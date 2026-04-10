import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Sparkles, Menu, X, ChevronRight, ChevronLeft, Copy, ChevronDown, AlignLeft } from 'lucide-react';
import ditaxLogo from '@/assets/ditax-logo-full.png';
import { DocsSidebar } from '@/components/docs/DocsSidebar';
import { DocsArticleContent } from '@/components/docs/DocsArticleContent';
import { DocsChatBot } from '@/components/docs/DocsChatBot';
import { docsCategories, getAllArticles } from '@/components/docs/DocsContent';

const HEADER_H = 'h-14';
const HEADER_TOP = 'top-14';
const HEADER_CALC = 'h-[calc(100vh-3.5rem)]';

const Help = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [selectedArticle, setSelectedArticle] = useState<{ articleId: string; categoryId: string }>({
    articleId: 'introduction',
    categoryId: 'getting-started',
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

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
    setMobileSearchOpen(false);
  };

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
      {/* ══════ Header ══════ */}
      <header className="border-b border-border/50 bg-background sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 flex items-center h-14 gap-3">
          {/* Back button */}
          <button
            onClick={() => navigate('/')}
            className="w-10 h-10 min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shrink-0 -ml-2 bg-white border border-white/60 shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
            aria-label="Zurück"
          >
            <ChevronLeft className="w-[18px] h-[18px]" strokeWidth={1.5} />
          </button>

          {/* spacer removed - hamburger moved to right */}

          {/* Logo */}
          <button onClick={() => navigate('/')} className="shrink-0">
            <img src={ditaxLogo} alt="Ditax" className="h-7 sm:h-8" />
          </button>

          <div className="flex-1" />

          {/* Desktop: Search + Ask AI centered */}
          <div className="hidden sm:flex items-center gap-2">
            <div className="relative w-64">
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
            <button
              onClick={() => setChatOpen(true)}
              className="flex items-center gap-2 h-10 px-4 rounded-lg border border-border/50 bg-background hover:bg-muted/40 text-sm font-medium transition-colors shrink-0"
            >
              <Sparkles className="w-4 h-4" />
              Ask AI
            </button>
          </div>

          {/* Mobile: search icon + AI icon + menu */}
          <div className="flex sm:hidden items-center gap-1">
            <button
              onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
              className="p-2 rounded-lg hover:bg-muted transition-colors touch-manipulation"
            >
              <Search className="w-5 h-5 text-muted-foreground" />
            </button>
            <button
              onClick={() => setChatOpen(true)}
              className="p-2 rounded-lg hover:bg-muted transition-colors touch-manipulation"
            >
              <Sparkles className="w-5 h-5 text-muted-foreground" />
            </button>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg hover:bg-muted transition-colors touch-manipulation"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

          <div className="hidden sm:block flex-1" />
        </div>

        {/* Row 2: Nav tabs (hidden on very small screens to save space) */}
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 hidden sm:block">
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

        {/* Mobile search bar (expandable) */}
        {mobileSearchOpen && (
          <div className="sm:hidden px-4 pb-3 pt-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Dokumentation durchsuchen..."
                autoFocus
                className="w-full h-10 pl-10 pr-10 rounded-xl border border-border/50 text-sm outline-none focus:ring-2 focus:ring-primary/20 bg-background placeholder:text-muted-foreground/40"
              />
              {search && (
                <button
                  onClick={() => { setSearch(''); setMobileSearchOpen(false); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 touch-manipulation"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* ══════ Body ══════ */}
      <div className="flex-1 flex max-w-[1400px] mx-auto w-full">
        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/20 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Left Sidebar */}
        <aside
          className={`
            fixed lg:sticky top-14 left-0 z-40 lg:z-auto
            w-[280px] sm:w-60 h-[calc(100vh-3.5rem)] overflow-y-auto
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
        <main className="flex-1 min-w-0 px-4 sm:px-10 lg:px-16 py-6 sm:py-8 pb-24 max-w-3xl">
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
                      className="w-full text-left rounded-xl border border-border/40 p-4 hover:bg-muted/30 transition-colors group touch-manipulation"
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

              {/* Prev / Next */}
              <div className="mt-14 pt-6 border-t border-border/40 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
                {prevArticle ? (
                  <button
                    onClick={() => handleSelectArticle(prevArticle.articleId, prevArticle.categoryId)}
                    className="flex items-center gap-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors group touch-manipulation"
                  >
                    <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform shrink-0" />
                    <div className="text-left">
                      <p className="text-[11px] text-muted-foreground/60 mb-0.5">Zurück</p>
                      <p className="font-medium text-foreground">{prevArticle.title}</p>
                    </div>
                  </button>
                ) : <div />}
                {nextArticle ? (
                  <button
                    onClick={() => handleSelectArticle(nextArticle.articleId, nextArticle.categoryId)}
                    className="flex items-center gap-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors sm:text-right sm:ml-auto group touch-manipulation"
                  >
                    <div className="sm:order-1">
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform shrink-0 sm:hidden" />
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground/60 mb-0.5">Weiter</p>
                      <p className="font-medium text-foreground">{nextArticle.title}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform shrink-0 hidden sm:block" />
                  </button>
                ) : <div />}
              </div>

              <div className="mt-8 pt-6 border-t border-border/40 text-[11px] text-muted-foreground/50">
                <span>Ditax Dokumentation</span>
              </div>
            </>
          )}
        </main>

        {/* Right TOC (desktop only) */}
        <aside className="hidden xl:block w-56 shrink-0 sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto py-8 pr-4">
          <DocsTableOfContents
            articleId={selectedArticle.articleId}
            categoryId={selectedArticle.categoryId}
          />
        </aside>
      </div>

      <DocsChatBot open={chatOpen} onOpenChange={setChatOpen} />
    </div>
  );
};

/* ── Right-side TOC ── */
const DocsTableOfContents: React.FC<{ articleId: string; categoryId: string }> = ({ articleId, categoryId }) => {
  const category = docsCategories.find(c => c.id === categoryId);
  const article = category?.articles.find(a => a.id === articleId);
  if (!article) return null;

  // For introduction, extract headings from the rich component
  const headings = articleId === 'introduction'
    ? [
        { level: 2, text: 'Übersicht' },
        { level: 2, text: 'Warum Ditax?' },
        { level: 2, text: 'So funktioniert\'s' },
        { level: 2, text: 'Verfügbarkeit' },
        { level: 2, text: 'Nächste Schritte' },
      ]
    : article.content
        .split('\n')
        .filter(line => /^#{2,3}\s/.test(line))
        .map(line => {
          const level = line.startsWith('###') ? 3 : 2;
          const text = line.replace(/^#{2,3}\s+/, '');
          return { level, text };
        });

  if (headings.length === 0) return null;

  const handleCopyPage = () => {
    const text = article.content || article.title;
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-5">
      {/* Copy page button */}
      <button
        onClick={handleCopyPage}
        className="flex items-center gap-2 text-sm text-foreground/70 hover:text-foreground border border-border/50 rounded-lg px-3 py-1.5 hover:bg-muted/40 transition-colors"
      >
        <Copy className="w-3.5 h-3.5" />
        <span>Copy page</span>
        <ChevronDown className="w-3.5 h-3.5 ml-auto text-muted-foreground/50" />
      </button>

      {/* On this page heading */}
      <div>
        <p className="text-xs font-medium text-foreground/60 mb-3 flex items-center gap-1.5 uppercase tracking-wide">
          <AlignLeft className="w-3.5 h-3.5" />
          On this page
        </p>
        <div className="border-l-2 border-border/30">
          {headings.map((h, i) => (
            <p
              key={i}
              className={`text-[13px] leading-relaxed py-0.5 transition-colors cursor-default ${
                h.level === 3
                  ? 'pl-5 text-muted-foreground/50 hover:text-muted-foreground'
                  : 'pl-3 text-muted-foreground hover:text-foreground'
              } ${i === 0 ? 'font-medium text-foreground border-l-2 border-foreground -ml-[2px]' : ''}`}
            >
              {h.text}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Help;
