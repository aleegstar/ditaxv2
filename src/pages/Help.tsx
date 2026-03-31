import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { SubpageHeader } from '@/components/ui/subpage-header';
import { DocsCategoryCard } from '@/components/docs/DocsCategory';
import { DocsArticleView } from '@/components/docs/DocsArticle';
import { DocsChatBot } from '@/components/docs/DocsChatBot';
import { docsCategories, getAllArticles } from '@/components/docs/DocsContent';

const Help = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [selectedArticle, setSelectedArticle] = useState<{ articleId: string; categoryId: string } | null>(null);

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

  if (selectedArticle) {
    return (
      <>
        <DocsArticleView
          articleId={selectedArticle.articleId}
          categoryId={selectedArticle.categoryId}
          onBack={() => setSelectedArticle(null)}
        />
        <DocsChatBot />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SubpageHeader title="Hilfe & Support" onBack={() => navigate(-1)} />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 pb-24">
        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Dokumentation durchsuchen..."
            className="w-full h-12 pl-11 pr-4 rounded-2xl bg-white border border-border/40 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.06)] text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-shadow placeholder:text-muted-foreground/50"
          />
        </div>

        {/* Search Results */}
        {filteredResults !== null ? (
          <div>
            <p className="text-xs text-muted-foreground mb-3 px-1">
              {filteredResults.length} Ergebnis{filteredResults.length !== 1 ? 'se' : ''} gefunden
            </p>
            {filteredResults.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-sm text-muted-foreground">Keine Ergebnisse gefunden.</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Versuche einen anderen Suchbegriff oder frage den Chatbot.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredResults.map((article) => (
                  <button
                    key={article.id}
                    onClick={() => setSelectedArticle({ articleId: article.id, categoryId: article.categoryId })}
                    className="w-full text-left bg-white rounded-2xl border border-border/40 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.06)] p-4 hover:shadow-[0_4px_12px_-4px_rgba(0,0,0,0.1)] transition-shadow"
                  >
                    <p className="text-sm font-medium text-foreground">{article.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{article.categoryTitle}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Categories Grid */
          <div className="grid gap-4 sm:grid-cols-2">
            {docsCategories.map((cat) => (
              <DocsCategoryCard
                key={cat.id}
                category={cat}
                onSelectArticle={(articleId, categoryId) =>
                  setSelectedArticle({ articleId, categoryId })
                }
              />
            ))}
          </div>
        )}
      </div>

      <DocsChatBot />
    </div>
  );
};

export default Help;
