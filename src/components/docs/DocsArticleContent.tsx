import React from 'react';
import ReactMarkdown from 'react-markdown';
import { docsCategories } from './DocsContent';

interface DocsArticleContentProps {
  articleId: string;
  categoryId: string;
}

export const DocsArticleContent: React.FC<DocsArticleContentProps> = ({ articleId, categoryId }) => {
  const category = docsCategories.find(c => c.id === categoryId);
  const article = category?.articles.find(a => a.id === articleId);

  if (!article || !category) return null;

  return (
    <div>
      {/* Breadcrumb */}
      <p className="text-sm text-primary font-medium mb-1">{category.title}</p>
      <h1 className="text-3xl font-bold text-foreground mb-4">{article.title}</h1>

      {/* Article content */}
      <div className="prose prose-sm max-w-none prose-headings:text-foreground prose-headings:font-semibold prose-p:text-foreground/75 prose-p:leading-relaxed prose-li:text-foreground/75 prose-strong:text-foreground prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-3 prose-h3:text-base prose-h3:mt-6 prose-h3:mb-2 prose-ul:my-3 prose-li:my-0.5">
        <ReactMarkdown>{article.content}</ReactMarkdown>
      </div>
    </div>
  );
};
