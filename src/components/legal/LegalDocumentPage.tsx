
import React, { useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import DOMPurify from 'dompurify';

interface LegalDocumentPageProps {
  title: string;
  gettermsId?: string;
  documentType?: 'privacy' | 'terms-of-service' | 'cookies' | 'acceptable-use';
  useWhiteBackground?: boolean;
  useDarkBackground?: boolean;
  staticContent?: string;
}

const LegalDocumentPage: React.FC<LegalDocumentPageProps> = ({
  title,
  gettermsId,
  documentType,
  useWhiteBackground = false,
  useDarkBackground = false,
  staticContent
}) => {
  useEffect(() => {
    if (gettermsId && documentType && !staticContent) {
      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.id = 'getterms-embed-js';
      script.src = 'https://gettermscdn.com/dist/js/embed.js';

      if (!document.getElementById('getterms-embed-js')) {
        document.head.appendChild(script);
      }

      return () => {
        const existingScript = document.getElementById('getterms-embed-js');
        if (existingScript) {
          existingScript.remove();
        }
      };
    }
  }, [gettermsId, documentType, staticContent]);

  const sanitizedContent = useMemo(() => {
    if (!staticContent) return '';
    return DOMPurify.sanitize(staticContent, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'a', 'span', 'div'],
      ALLOWED_ATTR: ['href', 'target', 'rel', 'class']
    });
  }, [staticContent]);

  // Dark background mode
  if (useDarkBackground) {
    return (
      <div className="container mx-auto px-4 py-6">
        {title && (
          <div className="flex flex-col space-y-4 mb-6">
            <h1 className="text-xl font-bold text-white">{title}</h1>
          </div>
        )}

        <Card className="bg-[#0A0C10] border border-white/[0.08] rounded-2xl">
          <CardContent className="p-6">
            {staticContent ? (
              <div className="prose prose-invert max-w-none">
                <div 
                  className="text-zinc-300 leading-relaxed [&_h1]:text-white [&_h2]:text-white [&_h3]:text-white [&_h4]:text-white [&_h5]:text-white [&_h6]:text-white [&_a]:text-[#1D64FF] [&_a]:hover:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-1"
                  dangerouslySetInnerHTML={{ __html: sanitizedContent }}
                />
              </div>
            ) : (
              <div 
                className="getterms-document-embed [&_*]:!text-white [&_a]:!text-[#1D64FF] [&_h1]:!text-white [&_h2]:!text-white [&_h3]:!text-white [&_h4]:!text-white [&_p]:!text-zinc-300 [&_li]:!text-zinc-300 [&_span]:!text-zinc-300" 
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
    );
  }

  // White background mode (legacy)
  if (useWhiteBackground) {
    return (
      <div className="min-h-screen bg-white">
        <div className="container mx-auto px-4 py-8">
          {title && (
            <div className="flex flex-col space-y-4 mb-6">
              <h1 className="text-xl font-bold text-gray-900">{title}</h1>
            </div>
          )}

          <Card className="bg-white border border-gray-200">
            <CardContent className="p-8 bg-white">
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
  }

  // Default dark gradient mode
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black">
      <div className="container mx-auto px-4 py-8">
        {title && (
          <div className="flex flex-col space-y-4 mb-6">
            <h1 className="text-xl font-bold text-white">{title}</h1>
          </div>
        )}

        <Card className="bg-white/10 backdrop-blur-sm border-white/20">
          <CardContent className="p-8 bg-zinc-100 rounded-xl">
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
