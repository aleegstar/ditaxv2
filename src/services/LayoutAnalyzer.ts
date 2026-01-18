/**
 * Layout Analyzer Service
 * 
 * Canvas-based visual analysis for document structure detection.
 * Works WITHOUT OCR - analyzes pixel patterns to detect:
 * - Table structures (horizontal/vertical lines)
 * - Header + body patterns
 * - Multi-column layouts
 * - Form-like structures with fields
 * - Dense text regions
 * 
 * PRIVACY: All processing is local, no data leaves the device.
 */

import { LayoutSignals } from '@/types/documentProfile';

interface PixelRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  density: number;
}

class LayoutAnalyzer {
  private static instance: LayoutAnalyzer;

  public static getInstance(): LayoutAnalyzer {
    if (!LayoutAnalyzer.instance) {
      LayoutAnalyzer.instance = new LayoutAnalyzer();
    }
    return LayoutAnalyzer.instance;
  }

  /**
   * Analyze layout of an image
   * @param imageBitmap - The image to analyze
   * @returns Layout signals
   */
  async analyzeLayout(imageBitmap: ImageBitmap): Promise<LayoutSignals> {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      console.warn('[LayoutAnalyzer] Canvas context not available');
      return this.getDefaultSignals();
    }

    // Scale down for faster processing (max 800px on longest side)
    const maxSize = 800;
    const scale = Math.min(maxSize / imageBitmap.width, maxSize / imageBitmap.height, 1);
    canvas.width = Math.round(imageBitmap.width * scale);
    canvas.height = Math.round(imageBitmap.height * scale);
    
    ctx.drawImage(imageBitmap, 0, 0, canvas.width, canvas.height);
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // Run all detection algorithms
    const tableLike = this.detectTablePattern(imageData);
    const headerPlusBody = this.detectHeaderBodyPattern(imageData);
    const columns = this.detectMultiColumn(imageData);
    const formLike = this.detectFormFields(imageData);
    const denseText = this.detectDenseText(imageData);
    
    // Calculate overall layout score (0-100)
    const layoutScore = this.calculateLayoutScore({
      tableLike,
      headerPlusBody,
      columns,
      formLike,
      denseText
    });

    return {
      layoutScore,
      detected: {
        tableLike,
        headerPlusBody,
        columns,
        formLike,
        denseText
      }
    };
  }

  /**
   * Analyze a file directly (handles both images and PDFs)
   */
  async analyzeFile(file: File): Promise<LayoutSignals> {
    try {
      if (file.type === 'application/pdf') {
        return await this.analyzePdfLayout(file);
      } else if (file.type.startsWith('image/')) {
        const imageBitmap = await this.createImageBitmapFromFile(file);
        const result = await this.analyzeLayout(imageBitmap);
        imageBitmap.close();
        
        // Add image-specific pattern detection
        const fileSizeKB = file.size / 1024;
        const width = imageBitmap.width;
        const height = imageBitmap.height;
        
        result.detected.documentAspectRatio = this.detectDocumentAspectRatio(width, height);
        result.detected.screenshotPattern = this.detectScreenshotPattern(width, height);
        result.detected.logoPattern = this.detectLogoPattern(width, height, fileSizeKB);
        result.detected.sufficientResolution = this.detectSufficientResolution(width, height);
        
        console.log('[LayoutAnalyzer] Image patterns:', {
          documentAspectRatio: result.detected.documentAspectRatio,
          screenshotPattern: result.detected.screenshotPattern,
          logoPattern: result.detected.logoPattern,
          sufficientResolution: result.detected.sufficientResolution,
          dimensions: `${width}x${height}`,
          fileSizeKB: Math.round(fileSizeKB)
        });
        
        return result;
      }
    } catch (error) {
      console.warn('[LayoutAnalyzer] Analysis failed:', error);
    }
    
    return this.getDefaultSignals();
  }

  /**
   * Analyze PDF by rendering first page
   */
  private async analyzePdfLayout(file: File): Promise<LayoutSignals> {
    if (!window.pdfjsLib) {
      console.warn('[LayoutAnalyzer] PDF.js not loaded');
      return this.getDefaultSignals();
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const page = await pdf.getPage(1);
      
      const scale = 1.0; // Lower scale for performance
      const viewport = page.getViewport({ scale });
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return this.getDefaultSignals();
      
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      
      await page.render({
        canvasContext: ctx,
        viewport: viewport
      }).promise;
      
      const imageBitmap = await createImageBitmap(canvas);
      const result = await this.analyzeLayout(imageBitmap);
      imageBitmap.close();
      
      return result;
    } catch (error) {
      console.warn('[LayoutAnalyzer] PDF analysis failed:', error);
      return this.getDefaultSignals();
    }
  }

  /**
   * Create ImageBitmap from a File
   */
  private async createImageBitmapFromFile(file: File): Promise<ImageBitmap> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      
      img.onload = async () => {
        URL.revokeObjectURL(url);
        try {
          const bitmap = await createImageBitmap(img);
          resolve(bitmap);
        } catch (e) {
          reject(e);
        }
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };
      
      img.src = url;
    });
  }

  /**
   * Detect table-like patterns (horizontal and vertical lines)
   */
  private detectTablePattern(imageData: ImageData): boolean {
    const { width, height, data } = imageData;
    
    // Convert to grayscale and detect edges
    const edges = this.detectEdges(imageData);
    
    // Count horizontal lines (rows of edge pixels)
    let horizontalLines = 0;
    let verticalLines = 0;
    const lineThreshold = width * 0.3; // Line must span 30% of width
    const verticalThreshold = height * 0.2; // Line must span 20% of height
    
    // Scan for horizontal lines
    for (let y = 0; y < height; y += 5) { // Sample every 5 rows
      let consecutiveEdge = 0;
      for (let x = 0; x < width; x++) {
        if (edges[y * width + x]) {
          consecutiveEdge++;
        } else {
          if (consecutiveEdge > lineThreshold) {
            horizontalLines++;
          }
          consecutiveEdge = 0;
        }
      }
      if (consecutiveEdge > lineThreshold) {
        horizontalLines++;
      }
    }
    
    // Scan for vertical lines
    for (let x = 0; x < width; x += 5) { // Sample every 5 columns
      let consecutiveEdge = 0;
      for (let y = 0; y < height; y++) {
        if (edges[y * width + x]) {
          consecutiveEdge++;
        } else {
          if (consecutiveEdge > verticalThreshold) {
            verticalLines++;
          }
          consecutiveEdge = 0;
        }
      }
      if (consecutiveEdge > verticalThreshold) {
        verticalLines++;
      }
    }
    
    // Table detected if we have multiple horizontal AND vertical lines
    return horizontalLines >= 3 && verticalLines >= 2;
  }

  /**
   * Detect header + body pattern (sparse top, dense middle)
   */
  private detectHeaderBodyPattern(imageData: ImageData): boolean {
    const { width, height, data } = imageData;
    
    // Divide into regions: top 20%, middle 60%, bottom 20%
    const headerHeight = Math.round(height * 0.2);
    const bodyStart = headerHeight;
    const bodyEnd = Math.round(height * 0.8);
    
    const headerDensity = this.calculateRegionDensity(imageData, 0, 0, width, headerHeight);
    const bodyDensity = this.calculateRegionDensity(imageData, 0, bodyStart, width, bodyEnd - bodyStart);
    
    // Header should have moderate content (logo, title), body should be denser
    return headerDensity > 0.05 && headerDensity < 0.4 && bodyDensity > headerDensity * 1.2;
  }

  /**
   * Detect multi-column layout
   */
  private detectMultiColumn(imageData: ImageData): boolean {
    const { width, height } = imageData;
    
    // Divide into 3 vertical sections
    const sectionWidth = Math.round(width / 3);
    
    const leftDensity = this.calculateRegionDensity(imageData, 0, 0, sectionWidth, height);
    const middleDensity = this.calculateRegionDensity(imageData, sectionWidth, 0, sectionWidth, height);
    const rightDensity = this.calculateRegionDensity(imageData, sectionWidth * 2, 0, width - sectionWidth * 2, height);
    
    // Multi-column if all sections have similar moderate density
    const avgDensity = (leftDensity + middleDensity + rightDensity) / 3;
    const variance = Math.abs(leftDensity - avgDensity) + Math.abs(middleDensity - avgDensity) + Math.abs(rightDensity - avgDensity);
    
    // Low variance between sections and all sections have content
    return variance < 0.15 && leftDensity > 0.1 && middleDensity > 0.1 && rightDensity > 0.1;
  }

  /**
   * Detect form-like structures (many small boxes/fields)
   */
  private detectFormFields(imageData: ImageData): boolean {
    const { width, height } = imageData;
    
    // Look for rectangular patterns
    const edges = this.detectEdges(imageData);
    
    // Count small rectangular regions
    let boxCount = 0;
    const boxMinSize = 20;
    const boxMaxSize = 150;
    
    // Sample grid for potential box corners
    for (let y = 0; y < height - boxMinSize; y += 15) {
      for (let x = 0; x < width - boxMinSize; x += 15) {
        if (edges[y * width + x]) {
          // Check if this could be a box corner
          // Look for horizontal and vertical edges
          let hasHorizontal = false;
          let hasVertical = false;
          
          for (let dx = 1; dx < boxMaxSize && x + dx < width; dx++) {
            if (edges[y * width + x + dx]) {
              hasHorizontal = true;
              break;
            }
          }
          
          for (let dy = 1; dy < boxMaxSize && y + dy < height; dy++) {
            if (edges[(y + dy) * width + x]) {
              hasVertical = true;
              break;
            }
          }
          
          if (hasHorizontal && hasVertical) {
            boxCount++;
          }
        }
      }
    }
    
    // Form-like if we detect many potential box corners
    return boxCount > 10;
  }

  /**
   * Detect dense text regions
   */
  private detectDenseText(imageData: ImageData): boolean {
    const overallDensity = this.calculateRegionDensity(imageData, 0, 0, imageData.width, imageData.height);
    
    // Dense text typically has high pixel density in central regions
    const centralDensity = this.calculateRegionDensity(
      imageData,
      Math.round(imageData.width * 0.1),
      Math.round(imageData.height * 0.1),
      Math.round(imageData.width * 0.8),
      Math.round(imageData.height * 0.8)
    );
    
    return centralDensity > 0.25;
  }

  /**
   * Simple edge detection using luminance threshold
   */
  private detectEdges(imageData: ImageData): boolean[] {
    const { width, height, data } = imageData;
    const edges = new Array(width * height).fill(false);
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        
        // Calculate luminance
        const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
        
        // Get neighboring luminance
        const lumLeft = 0.299 * data[idx - 4] + 0.587 * data[idx - 3] + 0.114 * data[idx - 2];
        const lumRight = 0.299 * data[idx + 4] + 0.587 * data[idx + 5] + 0.114 * data[idx + 6];
        const lumUp = 0.299 * data[(y - 1) * width * 4 + x * 4] + 0.587 * data[(y - 1) * width * 4 + x * 4 + 1] + 0.114 * data[(y - 1) * width * 4 + x * 4 + 2];
        const lumDown = 0.299 * data[(y + 1) * width * 4 + x * 4] + 0.587 * data[(y + 1) * width * 4 + x * 4 + 1] + 0.114 * data[(y + 1) * width * 4 + x * 4 + 2];
        
        // Edge if significant luminance difference
        const threshold = 30;
        if (Math.abs(lum - lumLeft) > threshold || Math.abs(lum - lumRight) > threshold ||
            Math.abs(lum - lumUp) > threshold || Math.abs(lum - lumDown) > threshold) {
          edges[y * width + x] = true;
        }
      }
    }
    
    return edges;
  }

  /**
   * Calculate pixel density for a region (dark pixels / total pixels)
   */
  private calculateRegionDensity(
    imageData: ImageData,
    startX: number,
    startY: number,
    regionWidth: number,
    regionHeight: number
  ): number {
    const { width, data } = imageData;
    let darkPixels = 0;
    let totalPixels = 0;
    
    const threshold = 200; // Pixels darker than this are considered "content"
    
    for (let y = startY; y < startY + regionHeight && y < imageData.height; y++) {
      for (let x = startX; x < startX + regionWidth && x < width; x++) {
        const idx = (y * width + x) * 4;
        const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
        
        if (lum < threshold) {
          darkPixels++;
        }
        totalPixels++;
      }
    }
    
    return totalPixels > 0 ? darkPixels / totalPixels : 0;
  }

  /**
   * Calculate overall layout score from detected features
   */
  private calculateLayoutScore(detected: LayoutSignals['detected']): number {
    let score = 30; // Base score
    
    // Each detected feature adds to the score
    if (detected.tableLike) score += 20;
    if (detected.headerPlusBody) score += 15;
    if (detected.columns) score += 10;
    if (detected.formLike) score += 15;
    if (detected.denseText) score += 10;
    
    return Math.min(100, score);
  }

  /**
   * Detect if image has A4/Letter-like aspect ratio (typical document)
   */
  private detectDocumentAspectRatio(width: number, height: number): boolean {
    const ratio = Math.max(width, height) / Math.min(width, height);
    // A4 = 1.414, Letter = 1.294, Legal = 1.647
    // Range 1.2 - 1.7 = probably a document
    return ratio >= 1.2 && ratio <= 1.7;
  }

  /**
   * Detect typical screenshot aspect ratios (16:9, phone portrait, etc.)
   */
  private detectScreenshotPattern(width: number, height: number): boolean {
    const ratio = width / height;
    // Landscape screenshots: 16:9 = 1.78, 18:9 = 2.0, 21:9 = 2.33
    const isLandscapeScreenshot = ratio >= 1.7 && ratio <= 2.4;
    // Portrait phone screenshots: typically 0.45 - 0.6 (9:16 = 0.5625, 9:18 = 0.5, 9:19.5 = 0.46)
    const isPortraitScreenshot = ratio >= 0.45 && ratio <= 0.6;
    return isLandscapeScreenshot || isPortraitScreenshot;
  }

  /**
   * Detect logo-like images (small, squarish, lightweight)
   */
  private detectLogoPattern(width: number, height: number, fileSizeKB: number): boolean {
    const ratio = width / height;
    const isSmall = Math.max(width, height) < 1000;
    const isSquarish = ratio >= 0.7 && ratio <= 1.4;
    const isLightweight = fileSizeKB < 300;
    // Must meet at least 2 of 3 criteria, with size being important
    return (isSmall && isSquarish) || (isSmall && isLightweight);
  }

  /**
   * Detect if resolution is sufficient for a scanned document
   */
  private detectSufficientResolution(width: number, height: number): boolean {
    // A scanned A4 at 150 DPI = ca. 1240 x 1754
    // Minimum for readable document: 800 x 1100
    const minDimension = Math.min(width, height);
    const maxDimension = Math.max(width, height);
    return minDimension >= 600 && maxDimension >= 800;
  }

  /**
   * Get default signals when analysis fails
   */
  private getDefaultSignals(): LayoutSignals {
    return {
      layoutScore: 30,
      detected: {
        tableLike: false,
        headerPlusBody: false,
        columns: false,
        formLike: false,
        denseText: false,
        documentAspectRatio: undefined,
        screenshotPattern: undefined,
        logoPattern: undefined,
        sufficientResolution: undefined
      }
    };
  }
}

export default LayoutAnalyzer;
