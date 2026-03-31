import React from 'react';
import ReactMarkdown from 'react-markdown';
import { SubpageHeader } from '@/components/ui/subpage-header';
import { docsCategories } from './DocsContent';

interface DocsArticleProps {
  articleId: string;
  categoryId: string;
  onBack: () => void;
}

export const DocsArticleView: React.FC<DocsArticleProps> = ({ articleId, categoryId, onBack }) => {
  const category = docsCategories.find(c => c.id === categoryId);
  const article = category?.articles.find(a => a.id === articleId);

  if (!article) return null;

  return (
    <div className="min-h-screen bg-background">
      <SubpageHeader title={article.title} onBack={onBack} />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pb-24 pt-2">
        <div className="bg-white rounded-[2rem] border border-border/40 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.08)] p-6">
          <div className="prose prose-sm max-w-none prose-headings:text-foreground prose-p:text-foreground/80 prose-li:text-foreground/80 prose-strong:text-foreground">
            <ReactMarkdown>{article.content}</ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
};
