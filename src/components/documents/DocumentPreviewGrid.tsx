import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FileText, Image as ImageIcon, Download, Edit2, Trash2, Calendar, Check, X, MoreVertical } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface DocumentPreviewGridProps {
  documents: any[];
  thumbnails: Map<string, string>;
  loadingThumbnails: boolean;
  onDocumentClick: (index: number) => void;
  onDelete: (documentId: string) => void;
  onDownload: (document: any) => void;
  onRename: (documentId: string, newName: string) => void;
  onYearChange: (document: any) => void;
}

const DocumentPreviewGrid: React.FC<DocumentPreviewGridProps> = ({
  documents,
  thumbnails,
  loadingThumbnails,
  onDocumentClick,
  onDelete,
  onDownload,
  onRename,
  onYearChange
}) => {
  const [editingDocumentId, setEditingDocumentId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <ImageIcon className="w-6 h-6 text-foreground" />;
    }
    return <FileText className="w-6 h-6 text-foreground" />;
  };

  const startEditing = (doc: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingDocumentId(doc.id);
    setEditingName(doc.file_name);
  };

  const cancelEditing = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingDocumentId(null);
    setEditingName('');
  };

  const saveEditing = (doc: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (editingName.trim()) {
      onRename(doc.id, editingName.trim());
      setEditingDocumentId(null);
      setEditingName('');
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {documents.map((doc, index) => {
        const thumbnail = thumbnails.get(doc.id);
        const isImage = doc.file_type.startsWith('image/');
        const isPdf = doc.file_type === 'application/pdf';
        const isEditing = editingDocumentId === doc.id;

        return (
          <Card
            key={doc.id}
            className="cursor-pointer hover:shadow-lg transition-all duration-300 overflow-hidden bg-white border border-border group relative"
            onClick={() => !isEditing && onDocumentClick(index)}
          >
            <div className="relative aspect-[3/4] bg-muted flex items-center justify-center overflow-hidden">
              {loadingThumbnails && !thumbnail ? (
                <div className="flex flex-col items-center justify-center gap-2">
                  {getFileIcon(doc.file_type)}
                  <div className="text-xs text-muted-foreground">Lädt...</div>
                </div>
              ) : thumbnail ? (
                <img
                  src={thumbnail}
                  alt={doc.file_name}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="flex flex-col items-center justify-center gap-2">
                  {getFileIcon(doc.file_type)}
                  <div className="text-xs text-muted-foreground">
                    {isPdf ? 'PDF' : isImage ? 'Bild' : 'Datei'}
                  </div>
                </div>
              )}
              
              {/* Actions Menu Button */}
              <div className="absolute top-2 left-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-8 w-8 p-0 rounded-full bg-white/90 hover:bg-white shadow-[rgba(0,0,0,0.15)_0px_0px_22px_-5px]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="w-4 h-4 text-foreground" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent 
                    className="w-48 p-2" 
                    align="start"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex flex-col gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="w-full justify-start text-xs h-9"
                        onClick={(e) => {
                          e.stopPropagation();
                          startEditing(doc, e);
                        }}
                      >
                        <Edit2 className="w-4 h-4 mr-2 text-foreground" />
                        Umbenennen
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="w-full justify-start text-xs h-9"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDownload(doc);
                        }}
                      >
                        <Download className="w-4 h-4 mr-2 text-foreground" />
                        Herunterladen
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="w-full justify-start text-xs h-9"
                        onClick={(e) => {
                          e.stopPropagation();
                          onYearChange(doc);
                        }}
                      >
                        <Calendar className="w-4 h-4 mr-2 text-foreground" />
                        Jahr ändern
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="w-full justify-start text-xs h-9 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(doc.id);
                        }}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Löschen
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Tax Year Badge */}
              <div className="absolute top-2 right-2">
                <Badge
                  variant="secondary"
                  className="text-xs"
                >
                  {doc.tax_year}
                </Badge>
              </div>
            </div>

            <div className="p-3 space-y-1">
              {isEditing ? (
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <Input
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    className="h-7 text-xs"
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0"
                    onClick={(e) => saveEditing(doc, e)}
                  >
                    <Check className="w-4 h-4 text-foreground" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0"
                    onClick={(e) => cancelEditing(e)}
                  >
                    <X className="w-4 h-4 text-foreground" />
                  </Button>
                </div>
              ) : (
                <div className="text-sm font-medium text-foreground truncate" title={doc.file_name}>
                  {doc.file_name}
                </div>
              )}
              <div className="text-xs text-muted-foreground">
                {format(new Date(doc.upload_date), 'dd.MM.yyyy', { locale: de })}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};

export default DocumentPreviewGrid;
