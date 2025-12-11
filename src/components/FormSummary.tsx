
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useFormContext } from '../contexts/FormContext';
import { CheckCircle } from 'lucide-react';

const FormSummary: React.FC = () => {
  const { formData, setCurrentStep } = useFormContext();
  const { contactInfo } = formData;

  const goToDocuments = () => {
    // Make sure we're explicitly setting to step 5 (documents step)
    setCurrentStep(5);
  };

  return (
    <Card 
      variant="glass" 
      className="w-full max-w-2xl mx-auto animate-fade-in rounded-3xl"
    >
      <CardHeader>
        <div className="flex items-center mb-2">
          <CheckCircle className="h-8 w-8 text-green-400 mr-2" />
          <CardTitle className="text-2xl text-white">Herzlichen Dank!</CardTitle>
        </div>
        <CardDescription className="text-white/80">
          Wir haben deine Angaben erfasst und eine individuelle Checkliste für dich erstellt.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div 
            className="p-4 rounded-3xl border border-white/10"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(15px)',
              boxShadow: 'inset 0 2px 4px rgba(255, 255, 255, 0.1), 0 8px 32px rgba(0, 0, 0, 0.3)'
            }}
          >
            <h3 className="font-medium mb-2 text-white">Zusammenfassung</h3>
            <p className="text-sm text-white/90">
              Sehr geehrte(r) {contactInfo.firstName} {contactInfo.lastName},<br /><br />
              
              basierend auf deinen Angaben haben wir eine personalisierte Checkliste für deine Steuerunterlagen erstellt. 
              Mit dieser Liste kannst du sicherstellen, dass alle relevanten Dokumente für deine Steuererklärung
              vorbereitet und hochgeladen werden.
              <br /><br />
              Bitte verwenden Sie die Dokumenten-Checkliste, um alle erforderlichen Unterlagen hochzuladen.
            </p>
          </div>

          <div className="text-center mt-8">
            <Button variant="login" onClick={goToDocuments} className="px-8">
              Zur Dokumenten-Checkliste
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FormSummary;
