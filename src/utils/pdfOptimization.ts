import { PDFDocument } from 'pdf-lib';

/**
 * Optimiert ein PDF durch:
 * - Entfernung nicht-essenzieller Metadaten
 * - Optimierung der PDF-Struktur
 */
export async function optimizePDF(file: File): Promise<File> {
  // Prüfe ob es ein PDF ist
  if (file.type !== 'application/pdf') {
    return file;
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);

    // Entferne nicht-essentielle Metadaten
    pdfDoc.setTitle('');
    pdfDoc.setAuthor('');
    pdfDoc.setProducer('');
    pdfDoc.setCreator('');
    pdfDoc.setSubject('');
    pdfDoc.setKeywords([]);

    // Speichere optimiert
    const optimizedBytes = await pdfDoc.save({
      useObjectStreams: false,
      addDefaultPage: false
    });

    const optimizedFile = new File([new Uint8Array(optimizedBytes)], file.name, { 
      type: 'application/pdf' 
    });

    const originalSizeKB = (file.size / 1024).toFixed(2);
    const optimizedSizeKB = (optimizedFile.size / 1024).toFixed(2);
    const savingsPercent = Math.round((1 - optimizedFile.size / file.size) * 100);

    console.log(`📄 PDF optimiert: ${originalSizeKB} KB → ${optimizedSizeKB} KB (${savingsPercent}% Einsparung)`);

    return optimizedFile;
  } catch (error) {
    console.error('PDF-Optimierung fehlgeschlagen:', error);
    // Fallback auf Original bei Fehler
    return file;
  }
}

/**
 * Gibt Optimierungs-Info für UI-Feedback zurück
 */
export function getOptimizationStats(originalSize: number, optimizedSize: number) {
  const originalSizeKB = (originalSize / 1024).toFixed(2);
  const optimizedSizeKB = (optimizedSize / 1024).toFixed(2);
  const savingsPercent = Math.round((1 - optimizedSize / originalSize) * 100);

  return {
    originalSizeKB,
    optimizedSizeKB,
    savingsPercent,
    message: `PDF optimiert: ${originalSizeKB} KB → ${optimizedSizeKB} KB (${savingsPercent}% Einsparung)`
  };
}
