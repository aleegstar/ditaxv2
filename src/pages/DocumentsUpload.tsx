import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FormProvider } from '@/contexts/form';
import EnhancedDocumentUploader from '@/components/EnhancedDocumentUploader';
import { AnimatedPageContainer } from '@/components/ui/animated-page-container';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const DocumentsUploadContent: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const year = searchParams.get('year') || new Date().getFullYear().toString();

  const handleBack = () => {
    navigate(`/documents?year=${year}`);
  };

  const handleUploadSuccess = () => {
    navigate(`/documents?year=${year}`);
  };

  return (
    <AnimatedPageContainer>
      <div className="min-h-screen pb-24">
        <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
          <div className="flex items-center gap-4 mb-6">
            <Button
              onClick={handleBack}
              variant="ghost"
              size="icon"
              className="h-10 w-10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                Dokumente hochladen
              </h1>
              <p className="text-sm md:text-base text-muted-foreground mt-1">
                Wähle Dateien aus und lade sie hoch
              </p>
            </div>
          </div>

          <EnhancedDocumentUploader
            onBack={handleBack}
            onDocumentSubmitted={handleUploadSuccess}
          />
        </div>
      </div>
    </AnimatedPageContainer>
  );
};

const DocumentsUpload: React.FC = () => {
  const [searchParams] = useSearchParams();
  const year = searchParams.get('year') || new Date().getFullYear().toString();

  return (
    <FormProvider taxYear={year}>
      <DocumentsUploadContent />
    </FormProvider>
  );
};

export default DocumentsUpload;
