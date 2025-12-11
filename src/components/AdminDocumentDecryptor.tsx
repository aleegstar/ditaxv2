
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from '@/hooks/use-toast';
import { ShieldCheck, Download, AlertTriangle } from 'lucide-react';
import EncryptedDocumentService from '@/services/EncryptedDocumentService';
import { DocumentMetadata } from '@/services/DocumentService';


interface AdminDocumentDecryptorProps {
  document: DocumentMetadata;
  adminUserId: string;
}

const AdminDocumentDecryptor: React.FC<AdminDocumentDecryptorProps> = ({
  document,
  adminUserId
}) => {
  const [isDecrypting, setIsDecrypting] = useState(false);
  const { toast } = useToast();
  const encryptedDocService = EncryptedDocumentService.getInstance();

  const handleDecryptAndDownload = async () => {
    if (!document.metadata?.encrypted) {
      toast({
        title: "Fehler",
        description: "Dieses Dokument ist nicht verschlüsselt",
        variant: "destructive",
      });
      return;
    }

    setIsDecrypting(true);

    try {
      const { blob, fileName, fileType } = await encryptedDocService.adminDownloadDecryptedDocument(
        document.id,
        adminUserId
      );

      // Create download link using DOM document object
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = fileName;
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Dokument entschlüsselt",
        description: `${fileName} wurde erfolgreich entschlüsselt und heruntergeladen.`,
      });
    } catch (error: any) {
      console.error('Error decrypting document:', error);
      toast({
        title: "Entschlüsselungsfehler",
        description: error.message || "Das Dokument konnte nicht entschlüsselt werden.",
        variant: "destructive",
      });
    } finally {
      setIsDecrypting(false);
    }
  };

  const isEncrypted = encryptedDocService.isDocumentEncrypted(document);

  if (!isEncrypted) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg border">
        <div className="flex items-center space-x-2 text-gray-600">
          <AlertTriangle className="h-4 w-4" />
          <span className="text-sm">Dieses Dokument ist nicht verschlüsselt</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <ShieldCheck className="h-5 w-5 text-blue-600" />
          <div>
            <h4 className="font-medium text-blue-900">Verschlüsseltes Dokument</h4>
            <p className="text-sm text-blue-700">
              Datei: {document.fileName}
            </p>
            <p className="text-xs text-blue-600">
              Verschlüsselung: AES-256-GCM
            </p>
          </div>
        </div>
        <Button
          onClick={handleDecryptAndDownload}
          disabled={isDecrypting}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isDecrypting ? (
            <div className="flex items-center gap-2">
              <span>Entschlüsselt...</span>
            </div>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Entschlüsseln & Download
            </>
          )}
        </Button>
      </div>
      
      <div className="mt-3 text-xs text-blue-600 bg-blue-100 p-2 rounded">
        <strong>Sicherheitshinweis:</strong> Dieser Zugriff wird protokolliert. 
        Das entschlüsselte Dokument sollte sicher behandelt werden.
      </div>
    </div>
  );
};

export default AdminDocumentDecryptor;
