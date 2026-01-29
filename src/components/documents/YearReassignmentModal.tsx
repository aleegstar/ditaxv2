import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Check, Search, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTaxFiler } from '@/contexts/TaxFilerContext';

interface YearReassignmentModalProps {
  open: boolean;
  onClose: () => void;
  currentYear: string;
  availableYears: string[];
  onReassignment: () => void;
}

const YearReassignmentModal: React.FC<YearReassignmentModalProps> = ({
  open,
  onClose,
  currentYear,
  availableYears,
  onReassignment
}) => {
  const [documents, setDocuments] = useState<any[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());
  const [targetYear, setTargetYear] = useState<string>('');
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { activeTaxFilerId } = useTaxFiler();

  useEffect(() => {
    if (open) {
      loadDocuments();
      setSelectedDocuments(new Set());
      setTargetYear('');
    }
  }, [open, currentYear]);

  useEffect(() => {
    filterDocuments();
  }, [documents, searchTerm]);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from('uploaded_documents')
        .select('*')
        .eq('user_id', user.id)
        .eq('tax_year', currentYear)
        .eq('status', 'active');

      if (activeTaxFilerId) {
        query = query.eq('tax_filer_id', activeTaxFilerId);
      }

      const { data, error } = await query.order('upload_date', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error loading documents:', error);
      toast({
        title: "Fehler",
        description: "Dokumente konnten nicht geladen werden",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filterDocuments = () => {
    let filtered = documents;

    if (searchTerm) {
      filtered = filtered.filter(doc =>
        doc.file_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredDocuments(filtered);
  };

  const toggleDocumentSelection = (documentId: string) => {
    const newSelection = new Set(selectedDocuments);
    if (newSelection.has(documentId)) {
      newSelection.delete(documentId);
    } else {
      newSelection.add(documentId);
    }
    setSelectedDocuments(newSelection);
  };

  const handleReassignDocuments = async () => {
    if (selectedDocuments.size === 0 || !targetYear) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('uploaded_documents')
        .update({
          tax_year: targetYear
        })
        .in('id', Array.from(selectedDocuments))
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Erfolg",
        description: `${selectedDocuments.size} Dokument(e) erfolgreich zu ${targetYear} zugeordnet`,
      });

      onReassignment();
      onClose();
    } catch (error) {
      console.error('Error reassigning documents:', error);
      toast({
        title: "Fehler",
        description: "Fehler beim Zuordnen der Dokumente",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent 
        className="w-full h-full max-w-none max-h-none rounded-none m-0 p-0 bg-white border-gray-200 gap-0 flex flex-col"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className={`bg-white border-b border-gray-100 flex-shrink-0 ${isMobile ? 'p-4' : 'p-6'}`}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-blue-600">
              <Calendar className="h-4 w-4 text-white" />
            </div>
            <div className="flex flex-col">
              <h2 className={`font-semibold text-gray-800 ${isMobile ? 'text-base' : 'text-lg'}`}>Steuerjahr ändern</h2>
              <p className="text-sm text-gray-500">{documents.length} Dokumente aus {currentYear}</p>
            </div>
          </div>
          
          <p className={`text-gray-600 mb-4 ${isMobile ? 'text-sm' : 'text-sm'}`}>
            Wähle Dokumente und das Ziel-Steuerjahr aus
          </p>

          {/* Year Selection */}
          <div className="mb-4">
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Ziel-Steuerjahr
            </label>
            <Select value={targetYear} onValueChange={setTargetYear}>
              <SelectTrigger className={`bg-white border-gray-200 text-gray-800 ${isMobile ? 'h-12' : ''}`}>
                <SelectValue placeholder="Steuerjahr auswählen..." />
              </SelectTrigger>
              <SelectContent className="bg-white border-gray-200 z-[100]">
                {availableYears
                  .filter(year => year !== currentYear)
                  .map(year => (
                    <SelectItem key={year} value={year} className="text-gray-800">
                      {year}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`pl-10 bg-white border-gray-200 text-gray-800 focus:border-blue-500 ${isMobile ? 'h-12' : ''}`}
            />
          </div>
        </div>

        {/* Document List */}
        <div className={`flex-1 overflow-y-auto bg-white ${isMobile ? 'px-4' : 'px-6'}`}>
          {loading ? (
            <div className="space-y-3 py-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className={`bg-gray-100 rounded-lg ${isMobile ? 'h-20' : 'h-16'}`}></div>
                </div>
              ))}
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className={`text-center ${isMobile ? 'py-16' : 'py-12'}`}>
              <FileText className={`text-gray-300 mx-auto mb-4 ${isMobile ? 'h-16 w-16' : 'h-12 w-12'}`} />
              <h3 className={`font-semibold text-gray-700 mb-2 ${isMobile ? 'text-base' : 'text-lg'}`}>
                Keine Dokumente gefunden
              </h3>
              <p className={`text-gray-500 ${isMobile ? 'text-sm px-4' : 'text-sm'}`}>
                Keine Dokumente entsprechen Ihren Suchkriterien.
              </p>
            </div>
          ) : (
            <div className={`space-y-3 ${isMobile ? 'py-2' : 'py-4'}`}>
              {filteredDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className={`cursor-pointer transition-all rounded-lg border ${isMobile ? 'p-4' : 'p-4'} ${
                    selectedDocuments.has(doc.id)
                      ? 'bg-blue-50 border-blue-200'
                      : 'bg-white border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={() => toggleDocumentSelection(doc.id)}
                >
                  <div className="flex items-center space-x-4">
                    <div className={`rounded-full flex-shrink-0 ${isMobile ? 'p-3' : 'p-2'} ${
                      selectedDocuments.has(doc.id) ? 'bg-blue-600' : 'bg-gray-100'
                    }`}>
                      {selectedDocuments.has(doc.id) ? (
                        <Check className={`text-white ${isMobile ? 'h-5 w-5' : 'h-4 w-4'}`} />
                      ) : (
                        <FileText className={`text-gray-400 ${isMobile ? 'h-5 w-5' : 'h-4 w-4'}`} />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-gray-800 font-medium truncate ${isMobile ? 'text-base' : 'text-sm'}`}>
                        {doc.file_name}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className={`text-gray-500 ${isMobile ? 'text-sm' : 'text-xs'}`}>
                          {format(new Date(doc.upload_date), 'dd.MM.yyyy', { locale: de })}
                        </p>
                        {doc.is_assigned_to_checklist ? (
                          <Badge variant="secondary" className={`bg-green-100 text-green-700 border-green-200 ${isMobile ? 'text-sm' : 'text-xs'}`}>
                            Zugeordnet
                          </Badge>
                        ) : (
                          <Badge variant="outline" className={`border-gray-200 text-gray-600 ${isMobile ? 'text-sm' : 'text-xs'}`}>
                            Unzugeordnet
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className={`bg-white border-t border-gray-100 flex-shrink-0 ${isMobile ? 'p-4' : 'p-6'}`}>
          <div className={`${isMobile ? 'flex flex-col space-y-3' : 'flex justify-between items-center'}`}>
            <p className={`text-gray-600 ${isMobile ? 'text-center text-sm' : 'text-sm'}`}>
              {selectedDocuments.size} Dokument(e) ausgewählt
            </p>
            <div className={`flex gap-3 ${isMobile ? 'w-full' : ''}`}>
              <Button
                variant="outline"
                onClick={onClose}
                className={`border-gray-200 text-gray-600 hover:bg-gray-50 ${isMobile ? 'flex-1 h-12' : ''}`}
              >
                Abbrechen
              </Button>
              <Button
                onClick={handleReassignDocuments}
                disabled={selectedDocuments.size === 0 || !targetYear}
                className={`bg-blue-600 hover:bg-blue-700 text-white ${isMobile ? 'flex-1 h-12' : ''}`}
              >
                {isMobile && selectedDocuments.size > 0 
                  ? 'Zuordnen'
                  : selectedDocuments.size > 0 
                  ? `${selectedDocuments.size} Dokument(e) zuordnen`
                  : 'Dokumente zuordnen'
                }
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default YearReassignmentModal;
