
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { FileIcon, Eye } from 'lucide-react';
import { UploadedDocument } from '@/types';
import { Button } from "@/components/ui/button";

interface DocumentCardProps {
  document: UploadedDocument;
  onPreview: (document: UploadedDocument) => void;
}

const DocumentCard: React.FC<DocumentCardProps> = ({ document, onPreview }) => {
  return (
    <Card className="border border-white/20 hover:bg-white/30 transition-colors shadow-sm" style={{
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      backdropFilter: 'blur(15px)',
      borderRadius: '16px'
    }}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            <FileIcon className="h-8 w-8 text-black/70 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-black font-medium text-sm truncate">{document.fileName}</p>
              <p className="text-black/60 text-xs">
                {document.uploadDate.toLocaleDateString('de-DE')}
              </p>
            </div>
          </div>
          <Button
            onClick={() => onPreview(document)}
            variant="outline"
            size="sm"
            className="bg-white/20 border-white/30 text-black hover:bg-white/30 flex-shrink-0 ml-2"
          >
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default DocumentCard;
