import { PDFDocument } from 'pdf-lib';

/**
 * Konvertiert ein Bild (JPG, PNG, etc.) in ein PDF-Dokument
 * Alle Verarbeitung erfolgt lokal im Browser - keine Daten werden übermittelt.
 * 
 * Unterstützt: JPEG, PNG, und andere Formate via Canvas-Konvertierung
 */
export async function convertImageToPdf(imageFile: File): Promise<File> {
  // Nur Bilder konvertieren
  if (!imageFile.type.startsWith('image/')) {
    return imageFile;
  }

  console.log(`[ImageToPdf] Converting ${imageFile.name} (${(imageFile.size / 1024).toFixed(1)} KB)`);

  try {
    // Bild als ArrayBuffer laden
    const imageBytes = await imageFile.arrayBuffer();
    
    // Neues PDF erstellen
    const pdfDoc = await PDFDocument.create();
    
    // Bild einbetten (JPEG oder PNG direkt, andere via Canvas)
    let image;
    if (imageFile.type === 'image/jpeg' || imageFile.type === 'image/jpg') {
      image = await pdfDoc.embedJpg(imageBytes);
    } else if (imageFile.type === 'image/png') {
      image = await pdfDoc.embedPng(imageBytes);
    } else {
      // Für andere Formate (WebP, HEIC, etc.): Canvas-Konvertierung zu PNG
      console.log(`[ImageToPdf] Converting ${imageFile.type} to PNG via Canvas`);
      const pngBytes = await convertToPng(imageFile);
      image = await pdfDoc.embedPng(pngBytes);
    }
    
    // Seite in Bildgröße erstellen (max A4 proportional skaliert für bessere Lesbarkeit)
    const maxWidth = 595; // A4 width in points
    const maxHeight = 842; // A4 height in points
    
    let pageWidth = image.width;
    let pageHeight = image.height;
    
    // Skalieren wenn Bild größer als A4
    if (pageWidth > maxWidth || pageHeight > maxHeight) {
      const scaleX = maxWidth / pageWidth;
      const scaleY = maxHeight / pageHeight;
      const scale = Math.min(scaleX, scaleY);
      pageWidth = pageWidth * scale;
      pageHeight = pageHeight * scale;
    }
    
    const page = pdfDoc.addPage([pageWidth, pageHeight]);
    
    // Bild auf volle Seitengröße zeichnen
    page.drawImage(image, {
      x: 0,
      y: 0,
      width: pageWidth,
      height: pageHeight
    });
    
    // PDF speichern
    const pdfBytes = await pdfDoc.save();
    
    // Neuen Dateinamen generieren
    const pdfFileName = imageFile.name.replace(/\.[^.]+$/, '.pdf');
    
    // Als File-Objekt zurückgeben - use ArrayBuffer for compatibility
    const pdfBuffer = pdfBytes.buffer.slice(pdfBytes.byteOffset, pdfBytes.byteOffset + pdfBytes.byteLength) as ArrayBuffer;
    const pdfFile = new File([pdfBuffer], pdfFileName, {
      type: 'application/pdf'
    });
    
    console.log(`[ImageToPdf] ✓ Converted: ${imageFile.name} (${(imageFile.size / 1024).toFixed(1)} KB) → ${pdfFileName} (${(pdfFile.size / 1024).toFixed(1)} KB)`);
    
    return pdfFile;
  } catch (error) {
    console.error('[ImageToPdf] Conversion failed:', error);
    throw new Error(`Bild-zu-PDF Konvertierung fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
  }
}

/**
 * Konvertiert beliebige Bildformate zu PNG via Canvas
 * Dies ermöglicht die Unterstützung von Formaten wie WebP, HEIC, etc.
 */
async function convertToPng(imageFile: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }
      
      ctx.drawImage(img, 0, 0);
      
      canvas.toBlob((blob) => {
        if (blob) {
          blob.arrayBuffer().then(resolve).catch(reject);
        } else {
          reject(new Error('Canvas to Blob conversion failed'));
        }
      }, 'image/png');
      
      // Cleanup
      URL.revokeObjectURL(img.src);
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('Image load failed'));
    };
    
    img.src = URL.createObjectURL(imageFile);
  });
}
