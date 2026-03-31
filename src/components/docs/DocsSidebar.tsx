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
    <nav className="py-5 px-3 space-y-5">
      {docsCategories.map((cat) => {
        const Icon = cat.icon;
        return (
          <div key={cat.id}>
            <p className="text-[11px] font-semibold text-foreground/60 uppercase tracking-wider mb-1.5 px-2.5">
              {cat.title}
            </p>
            <div className="space-y-px">
              {cat.articles.map((article) => {
                const isActive = article.id === selectedArticleId && cat.id === selectedCategoryId;
                return (
                  <button
                    key={article.id}
                    onClick={() => onSelectArticle(article.id, cat.id)}
                    className={cn(
                      'w-full text-left px-2.5 py-[7px] rounded-lg text-[13px] transition-colors flex items-center gap-2',
                      isActive
                        ? 'bg-primary/8 text-primary font-medium'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                    )}
                  >
                    {isActive && (
                      <span className="w-1 h-1 rounded-full bg-primary shrink-0" />
                    )}
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
