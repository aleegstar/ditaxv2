import React from 'react';
import { docsCategories } from './DocsContent';
import { cn } from '@/lib/utils';

interface DocsSidebarProps {
  selectedArticleId: string;
  selectedCategoryId: string;
  onSelectArticle: (articleId: string, categoryId: string) => void;
}

export const DocsSidebar: React.FC<DocsSidebarProps> = ({
  selectedArticleId,
  selectedCategoryId,
  onSelectArticle,
}) => {
  return (
    <nav className="py-6 px-4 space-y-6">
      {docsCategories.map((cat) => {
        const Icon = cat.icon;
        return (
          <div key={cat.id}>
            <p className="text-xs font-semibold text-foreground/80 uppercase tracking-wider mb-2 px-2">
              {cat.title}
            </p>
            <div className="space-y-0.5">
              {cat.articles.map((article) => {
                const isActive = article.id === selectedArticleId && cat.id === selectedCategoryId;
                return (
                  <button
                    key={article.id}
                    onClick={() => onSelectArticle(article.id, cat.id)}
                    className={cn(
                      'w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors',
                      isActive
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    )}
                  >
                    {article.title}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </nav>
  );
};
