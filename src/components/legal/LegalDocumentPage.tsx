
import React, { useEffect, useMemo } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import DOMPurify from 'dompurify';

interface LegalDocumentPageProps {
  title: string;
  gettermsId?: string;
  documentType?: 'privacy' | 'terms-of-service' | 'cookies' | 'acceptable-use';
  useWhiteBackground?: boolean;
  staticContent?: string;
}

const LegalDocumentPage: React.FC<LegalDocumentPageProps> = ({
  title,
  gettermsId,
  documentType,
  useWhiteBackground = false,
  staticContent
}) => {
  const navigate = useNavigate();

  useEffect(() => {
    // Only load GetTerms script if we're using embed
    if (gettermsId && documentType && !staticContent) {
      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.id = 'getterms-embed-js';
      script.src = 'https://gettermscdn.com/dist/js/embed.js';

      // Check if script is already loaded
      if (!document.getElementById('getterms-embed-js')) {
        document.head.appendChild(script);
      }

      return () => {
        // Cleanup - remove script if component unmounts
        const existingScript = document.getElementById('getterms-embed-js');
        if (existingScript) {
          existingScript.remove();
        }
      };
    }
  }, [gettermsId, documentType, staticContent]);

  const backgroundClass = useWhiteBackground 
    ? "min-h-screen bg-white" 
    : "min-h-screen bg-gradient-to-br from-gray-900 to-black";

  const titleClass = useWhiteBackground 
    ? "text-xl font-bold text-gray-900" 
    : "text-xl font-bold text-white";

  const cardClass = useWhiteBackground 
    ? "bg-white border border-gray-200" 
    : "bg-white/10 backdrop-blur-sm border-white/20";

  const contentClass = useWhiteBackground 
    ? "p-8 bg-white" 
    : "p-8 bg-zinc-100 rounded-xl";

  // Sanitize HTML content to prevent XSS attacks
  const sanitizedContent = useMemo(() => {
    if (!staticContent) return '';
    return DOMPurify.sanitize(staticContent, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'a', 'span', 'div'],
      ALLOWED_ATTR: ['href', 'target', 'rel', 'class']
    });
  }, [staticContent]);

  return (
    <div className={backgroundClass}>
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col space-y-4 mb-6">
          <h1 className={titleClass}>{title}</h1>
        </div>

        <Card className={cardClass}>
          <CardContent className={contentClass}>
            {staticContent ? (
              <div className="prose prose-gray max-w-none">
                <div 
                  className="text-gray-900 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: sanitizedContent }}
                />
              </div>
            ) : (
              <div 
                className="getterms-document-embed" 
                data-getterms={gettermsId} 
                data-getterms-document={documentType} 
                data-getterms-lang="de" 
                data-getterms-mode="direct" 
                data-getterms-env="https://gettermscdn.com" 
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LegalDocumentPage;
