import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useFormContext } from '@/contexts';
import { ArrowLeft, Check, FileText, AlertCircle } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';

export const SubmissionForm: React.FC = () => {
  const { formData, updateFormProgress, checklistItems } = useFormContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [confirmations, setConfirmations] = useState({
    dataComplete: false,
    dataCorrect: false,
    termsAccepted: false
  });

  const handleBack = () => {
    setSearchParams({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!confirmations.dataComplete || !confirmations.dataCorrect || !confirmations.termsAccepted) {
      toast({
        title: "Bestätigung erforderlich",
        description: "Bitte bestätigen Sie alle Punkte vor dem Einreichen.",
        variant: "destructive"
      });
      return;
    }

    if (!documentStats.allUploaded) {
      toast({
        title: "Dokumente fehlen",
        description: `Es fehlen noch ${documentStats.missing.length} erforderliche Dokumente.`,
        variant: "destructive"
      });
      return;
    }

    try {
      updateFormProgress('submit' as any, true);
      toast({
        title: "Steuererklärung eingereicht",
        description: "Deine Steuererklärung wurde erfolgreich eingereicht."
      });
      setSearchParams({});
    } catch (error) {
      toast({
        title: "Fehler",
        description: "Beim Einreichen ist ein Fehler aufgetreten.",
        variant: "destructive"
      });
    }
  };

  const isAllDataComplete = () => {
    return formData?.contactInfo && formData?.income && formData?.deductions && formData?.assets;
  };

  const documentStats = useMemo(() => {
    const requiredDocs = checklistItems.filter(item => item.required);
    const uploadedRequiredDocs = requiredDocs.filter(item => item.uploaded);
    const missingDocs = requiredDocs.filter(item => !item.uploaded);
    
    return {
      total: requiredDocs.length,
      uploaded: uploadedRequiredDocs.length,
      missing: missingDocs,
      allUploaded: missingDocs.length === 0
    };
  }, [checklistItems]);

  const isReadyToSubmit = () => {
    return isAllDataComplete() && documentStats.allUploaded;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 p-4">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6"
        >
          {/* Header */}
          <div className="flex items-center mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="text-white hover:bg-white/20 mr-4"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h2 className="text-2xl font-bold text-white">Steuererklärung einreichen</h2>
          </div>

          {/* Content */}
          <div className="space-y-6">
            {/* Status Overview */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4">
              <h3 className="text-white font-semibold mb-4">Status deiner Angaben</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full ${formData?.contactInfo ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                  <span className="text-white">Kontaktangaben</span>
                  {formData?.contactInfo && <Check className="w-4 h-4 text-green-500" />}
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full ${formData?.income ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                  <span className="text-white">Einkommen</span>
                  {formData?.income && <Check className="w-4 h-4 text-green-500" />}
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full ${formData?.deductions ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                  <span className="text-white">Abzüge</span>
                  {formData?.deductions && <Check className="w-4 h-4 text-green-500" />}
                </div>
                 <div className="flex items-center gap-2">
                   <div className={`w-4 h-4 rounded-full ${formData?.assets ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                   <span className="text-white">Vermögen</span>
                   {formData?.assets && <Check className="w-4 h-4 text-green-500" />}
                 </div>
                 <div className="flex items-center gap-2">
                   <div className={`w-4 h-4 rounded-full ${documentStats.allUploaded ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                   <span className="text-white">Dokumente ({documentStats.uploaded}/{documentStats.total})</span>
                   {documentStats.allUploaded && <Check className="w-4 h-4 text-green-500" />}
                 </div>
               </div>
             </div>

             {/* Missing Documents Alert */}
             {documentStats.missing.length > 0 && (
               <div className="bg-red-500/10 backdrop-blur-sm border border-red-500/20 rounded-lg p-4">
                 <div className="flex items-start gap-3">
                   <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                   <div className="space-y-2">
                     <h4 className="text-red-400 font-semibold">Fehlende Dokumente</h4>
                     <p className="text-white/80 text-sm">
                       Folgende Dokumente müssen noch hochgeladen werden:
                     </p>
                     <ul className="text-white/80 text-sm space-y-1">
                       {documentStats.missing.map((doc) => (
                         <li key={doc.id} className="flex items-center gap-2">
                           <FileText className="w-3 h-3" />
                           {doc.title}
                         </li>
                       ))}
                     </ul>
                     <Button
                       type="button"
                       variant="outline"
                       size="sm"
                       onClick={() => navigate('/documents')}
                       className="mt-2 border-red-400/30 text-red-400 hover:bg-red-400/10"
                     >
                       Dokumente hochladen
                     </Button>
                   </div>
                 </div>
               </div>
             )}

            {/* Confirmation */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="dataComplete"
                    checked={confirmations.dataComplete}
                    onCheckedChange={(checked) => 
                      setConfirmations(prev => ({ ...prev, dataComplete: checked === true }))
                    }
                  />
                  <label htmlFor="dataComplete" className="text-white text-sm">
                    Ich bestätige, dass ich alle erforderlichen Angaben gemacht habe.
                  </label>
                </div>

                <div className="flex items-start gap-3">
                  <Checkbox
                    id="dataCorrect"
                    checked={confirmations.dataCorrect}
                    onCheckedChange={(checked) => 
                      setConfirmations(prev => ({ ...prev, dataCorrect: checked === true }))
                    }
                  />
                  <label htmlFor="dataCorrect" className="text-white text-sm">
                    Ich bestätige, dass alle Angaben korrekt und vollständig sind.
                  </label>
                </div>

                <div className="flex items-start gap-3">
                  <Checkbox
                    id="termsAccepted"
                    checked={confirmations.termsAccepted}
                    onCheckedChange={(checked) => 
                      setConfirmations(prev => ({ ...prev, termsAccepted: checked === true }))
                    }
                  />
                  <label htmlFor="termsAccepted" className="text-white text-sm">
                    Ich akzeptiere die Nutzungsbedingungen und Datenschutzerklärung.
                  </label>
                </div>
              </div>

               <Button
                 type="submit"
                 className="w-full bg-white text-gray-900 hover:bg-white/90 font-medium disabled:opacity-50"
                 disabled={!isReadyToSubmit() || !confirmations.dataComplete || !confirmations.dataCorrect || !confirmations.termsAccepted}
               >
                 Steuererklärung einreichen
               </Button>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
