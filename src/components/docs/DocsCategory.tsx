import React from 'react';
import { ChevronRight } from 'lucide-react';
import { type DocsCategory as DocsCategoryType } from './DocsContent';

interface DocsCategoryProps {
  category: DocsCategoryType;
  onSelectArticle: (articleId: string, categoryId: string) => void;
}

export const DocsCategoryCard: React.FC<DocsCategoryProps> = ({ category, onSelectArticle }) => {
  const Icon = category.icon;

  return (
    <div className="bg-white rounded-[2rem] border border-border/40 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.08)] overflow-hidden">
      <div className="p-5 pb-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-b from-[hsl(222,100%,60%)] to-[hsl(222,100%,47%)] flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold text-foreground text-[15px] leading-tight">{category.title}</h3>
          <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{category.description}</p>
        </div>
      </div>
      <div className="px-3 pb-3">
        {category.articles.map((article) => (
          <button
            key={article.id}
            onClick={() => onSelectArticle(article.id, category.id)}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left hover:bg-muted/50 transition-colors group"
          >
            <span className="text-sm text-foreground/80 group-hover:text-foreground transition-colors">
              {article.title}
            </span>
            <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
};
