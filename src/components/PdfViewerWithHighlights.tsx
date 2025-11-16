'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { HighlightData, HighlightCoordinates } from '@/types';

interface PdfViewerWithHighlightsProps {
  file: File | null;
  highlights: HighlightData[];
  isOpen: boolean;
  onClose: () => void;
  initialPage?: number;
  referenceNumber?: number;
}

export const PdfViewerWithHighlights: React.FC<PdfViewerWithHighlightsProps> = ({
  file,
  highlights,
  isOpen,
  onClose,
  initialPage = 1,
  referenceNumber
}) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(initialPage);
  const [pageScale, setPageScale] = useState<number>(1.5);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pdfLoaded, setPdfLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pageDimensions, setPageDimensions] = useState<{ 
    width: number; 
    height: number;
    scale: number;
    pageWidthPoints: number;
    pageHeightPoints: number;
  } | null>(null);

  // Filter highlights for current reference if specified
  const filteredHighlights = referenceNumber
    ? highlights.filter(h => h.ref_number === referenceNumber)
    : highlights;

  // Group highlights by page
  const highlightsByPage = React.useMemo(() => {
    const map = new Map<number, HighlightData[]>();
    filteredHighlights.forEach(highlight => {
      const page = highlight.page;
      if (!map.has(page)) {
        map.set(page, []);
      }
      map.get(page)!.push(highlight);
    });
    return map;
  }, [filteredHighlights]);

  // Reset to initial page when modal opens
  useEffect(() => {
    if (isOpen && initialPage) {
      setPageNumber(initialPage);
    }
  }, [isOpen, initialPage]);

  // Find first page with highlights if no initial page specified
  useEffect(() => {
    if (isOpen && !initialPage && filteredHighlights.length > 0) {
      const firstPage = Math.min(...filteredHighlights.map(h => h.page));
      setPageNumber(firstPage);
    }
  }, [isOpen, initialPage, filteredHighlights]);

  // Load PDF.js from CDN and render PDF
  useEffect(() => {
    if (!isOpen || !file || pdfLoaded) return;

    let objectUrl: string | null = null;

    const loadPdfJs = (): Promise<any> => {
      return new Promise((resolve, reject) => {
        // Check if PDF.js is already loaded
        if ((window as any).pdfjsLib) {
          resolve((window as any).pdfjsLib);
          return;
        }

        // Use the UMD build that exposes pdfjsLib globally
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        script.async = true;
        
        script.onload = () => {
          // PDF.js 3.x exposes itself as pdfjsLib or pdfjs on window
          const pdfjsLib = (window as any).pdfjsLib || (window as any).pdfjs;
          
          if (!pdfjsLib) {
            reject(new Error('PDF.js failed to load'));
            return;
          }

          // Configure worker
          if (pdfjsLib.GlobalWorkerOptions) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          }

          // Store globally for reuse
          (window as any).pdfjsLib = pdfjsLib;
          resolve(pdfjsLib);
        };
        
        script.onerror = () => {
          reject(new Error('Failed to load PDF.js script'));
        };
        
        document.head.appendChild(script);
      });
    };

    const loadAndRender = async () => {
      try {
        const pdfjsLib = await loadPdfJs();
        
        if (!pdfjsLib || !pdfjsLib.getDocument) {
          throw new Error('PDF.js library not properly loaded');
        }

        objectUrl = URL.createObjectURL(file);
        const loadingTask = pdfjsLib.getDocument({ url: objectUrl });
        const pdf = await loadingTask.promise;
        
        setPdfDoc(pdf);
        setNumPages(pdf.numPages);
        setPdfLoaded(true);
        setLoadError(null);
      } catch (err: any) {
        console.error('Failed to load PDF:', err);
        setLoadError(err?.message || 'Failed to load PDF');
        setPdfLoaded(true);
      }
    };

    loadAndRender();

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [isOpen, file, pdfLoaded]);

  // Render PDF page to canvas
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current || pageNumber < 1) return;

    const renderPage = async () => {
      try {
        const page = await pdfDoc.getPage(pageNumber);
        const viewport = page.getViewport({ scale: pageScale });
        const canvas = canvasRef.current;
        if (!canvas) return;

        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        // Store both viewport dimensions (pixels) and page dimensions (PDF points)
        const pageSize = page.getViewport({ scale: 1.0 });
        setPageDimensions({ 
          width: viewport.width, 
          height: viewport.height,
          scale: pageScale,
          pageWidthPoints: pageSize.width,
          pageHeightPoints: pageSize.height
        });

        const context = canvas.getContext('2d');
        if (!context) return;

        const renderContext = {
          canvasContext: context,
          viewport: viewport
        };

        await page.render(renderContext).promise;
      } catch (err) {
        console.error('Failed to render PDF page:', err);
      }
    };

    renderPage();
  }, [pdfDoc, pageNumber, pageScale]);

  const goToPrevPage = () => {
    setPageNumber(prev => Math.max(1, prev - 1));
  };

  const goToNextPage = () => {
    setPageNumber(prev => Math.min(numPages, prev + 1));
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return;
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowLeft') {
      goToPrevPage();
    } else if (e.key === 'ArrowRight') {
      goToNextPage();
    }
  }, [isOpen, onClose, numPages]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  if (!isOpen || !file) {
    return null;
  }

  if (!pdfLoaded) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm">
        <div className="bg-white rounded-lg p-8">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 border-4 border-blue-200 rounded-full animate-spin border-t-blue-600"></div>
            <span className="text-gray-700">Loading PDF viewer...</span>
          </div>
        </div>
      </div>
    );
  }

  if (loadError || !pdfDoc) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm">
        <div className="bg-white rounded-lg p-8">
          <div className="text-center">
            <p className="text-red-600 mb-2">Failed to load PDF viewer</p>
            {loadError && (
              <p className="text-sm text-gray-600 mb-4">{loadError}</p>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentPageHighlights = highlightsByPage.get(pageNumber) || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm">
      <div className="relative w-full h-full max-w-7xl max-h-[95vh] m-4 bg-white rounded-lg shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
          <div className="flex items-center space-x-4">
            <h3 className="text-lg font-semibold text-gray-900">
              PDF Viewer
            </h3>
            {referenceNumber && (
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                Reference [{referenceNumber}]
              </span>
            )}
            {currentPageHighlights.length > 0 && (
              <span className="text-sm text-gray-600">
                {currentPageHighlights.length} highlight{currentPageHighlights.length > 1 ? 's' : ''} on this page
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded hover:bg-gray-100"
            aria-label="Close PDF viewer"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* PDF Content */}
        <div className="flex-1 overflow-auto bg-gray-100 p-4">
          <div className="flex justify-center">
            <div ref={containerRef} className="relative inline-block">
              <canvas
                ref={canvasRef}
                className="shadow-lg bg-white"
                style={{ display: 'block' }}
              />
              {/* Highlight Overlay */}
              {currentPageHighlights.length > 0 && pageDimensions && (
                <HighlightOverlay
                  highlights={currentPageHighlights}
                  pageDimensions={pageDimensions}
                  scale={pageScale}
                />
              )}
            </div>
          </div>
        </div>

        {/* Footer with Controls */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          <div className="flex items-center space-x-2">
            <button
              onClick={goToPrevPage}
              disabled={pageNumber <= 1}
              className="px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-sm text-gray-700">
              Page {pageNumber} of {numPages}
            </span>
            <button
              onClick={goToNextPage}
              disabled={pageNumber >= numPages}
              className="px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPageScale(prev => Math.max(0.5, prev - 0.25))}
              className="px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              −
            </button>
            <span className="px-3 py-2 text-sm text-gray-700 min-w-[60px] text-center">
              {Math.round(pageScale * 100)}%
            </span>
            <button
              onClick={() => setPageScale(prev => Math.min(2.0, prev + 0.25))}
              className="px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              +
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface HighlightOverlayProps {
  highlights: HighlightData[];
  pageDimensions: { 
    width: number; 
    height: number;
    scale: number;
    pageWidthPoints: number;
    pageHeightPoints: number;
  };
  scale: number;
}

const HighlightOverlay: React.FC<HighlightOverlayProps> = ({
  highlights,
  pageDimensions,
  scale
}) => {
  return (
    <div
      className="absolute top-0 left-0 pointer-events-none"
      style={{
        width: `${pageDimensions.width}px`,
        height: `${pageDimensions.height}px`,
      }}
    >
      {highlights.map((highlight, index) => {
        const coords = transformCoordinates(
          highlight.coordinates,
          pageDimensions.width,
          pageDimensions.height,
          pageDimensions.pageWidthPoints,
          pageDimensions.pageHeightPoints,
          pageDimensions.scale
        );
        
        if (!coords) return null;

        return (
          <div
            key={`${highlight.chunk_id}-${index}`}
            className="absolute bg-yellow-400/40 border border-yellow-500/60 rounded"
            style={{
              left: `${coords.x}px`,
              top: `${coords.y}px`,
              width: `${coords.width}px`,
              height: `${coords.height}px`,
            }}
            title={`Reference [${highlight.ref_number}] - ${highlight.text_preview || highlight.text || 'Highlight'}`}
          />
        );
      })}
    </div>
  );
};

// Transform Docling coordinates to PDF.js canvas coordinates
function transformCoordinates(
  coords: HighlightCoordinates,
  viewportWidth: number,
  viewportHeight: number,
  pageWidthPoints: number,
  pageHeightPoints: number,
  scale: number
): { x: number; y: number; width: number; height: number } | null {
  // Docling coordinates: l (left), r (right), t (top), b (bottom)
  // Coordinates are in PDF points (absolute), not normalized
  // coord_origin: 'BOTTOMLEFT' means bottom-left origin (PDF standard)
  
  let left: number = coords.l;
  let right: number = coords.r;
  let top: number = coords.t;
  let bottom: number = coords.b;

  // Check if coordinates are normalized (0-1 range)
  const isNormalized = coords.l >= 0 && coords.l <= 1 && coords.r >= 0 && coords.r <= 1 && 
                       coords.t >= 0 && coords.t <= 1 && coords.b >= 0 && coords.b <= 1;

  if (isNormalized) {
    // Normalized coordinates: convert to PDF points first
    left = coords.l * pageWidthPoints;
    right = coords.r * pageWidthPoints;
    top = coords.t * pageHeightPoints;
    bottom = coords.b * pageHeightPoints;
  }
  // Otherwise, coordinates are already in PDF points

  // Handle coordinate system origin
  // coord_origin: 'BOTTOMLEFT' means PDF coordinate system (bottom-left origin)
  const coordOrigin = (coords.coord_origin || '').toLowerCase();
  if (coordOrigin === 'bottomleft' || coordOrigin === 'bottom-left' || coordOrigin === 'pdf') {
    // PDF uses bottom-left origin, web uses top-left
    // Flip Y coordinates: y_web = pageHeight - y_pdf
    const pdfTop = pageHeightPoints - top;
    const pdfBottom = pageHeightPoints - bottom;
    top = pdfTop;
    bottom = pdfBottom;
  }
  // If coord_origin is 'top-left' or similar, no flipping needed

  // Convert from PDF points to viewport pixels by scaling
  const scaleX = viewportWidth / pageWidthPoints;
  const scaleY = viewportHeight / pageHeightPoints;

  const x = left * scaleX;
  const y = top * scaleY;
  const width = (right - left) * scaleX;
  const height = (bottom - top) * scaleY;

  // More lenient validation - allow some margin for rounding errors
  if (width <= 0 || height <= 0) {
    console.warn('Invalid coordinate dimensions:', { width, height, coords });
    return null;
  }

  // Allow coordinates slightly outside viewport due to rounding
  if (x < -10 || y < -10 || x + width > viewportWidth + 10 || y + height > viewportHeight + 10) {
    console.warn('Coordinates outside viewport:', { 
      coords, 
      viewportWidth, 
      viewportHeight, 
      x, 
      y, 
      width, 
      height,
      pageWidthPoints,
      pageHeightPoints
    });
    // Still return the coordinates, just clamp them
    return {
      x: Math.max(0, Math.min(x, viewportWidth)),
      y: Math.max(0, Math.min(y, viewportHeight)),
      width: Math.min(width, viewportWidth),
      height: Math.min(height, viewportHeight)
    };
  }

  return { x, y, width, height };
}
