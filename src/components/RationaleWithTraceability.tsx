'use client';

import React, { useMemo, useEffect, useRef, useState } from 'react';
import { convertMarkupToHtml } from '@/utils/markupConverter';
import { TraceabilityData, HighlightData } from '@/types';
import { TraceabilityPopover } from './TraceabilityPopover';

interface RationaleWithTraceabilityProps {
  rationale: string;
  traceability?: TraceabilityData;
  onReferenceClick?: (refNumber: number, highlights: HighlightData[]) => void;
}

export const RationaleWithTraceability: React.FC<RationaleWithTraceabilityProps> = ({
  rationale,
  traceability,
  onReferenceClick
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverStateRef = useRef<{
    visible: boolean;
    refNumber: number;
    chunks: HighlightData[];
    position: { top: number; left: number };
  } | null>(null);
  const [popoverState, setPopoverState] = useState<{
    visible: boolean;
    refNumber: number;
    chunks: HighlightData[];
    position: { top: number; left: number };
  } | null>(null);

  // Keep ref in sync with state
  useEffect(() => {
    popoverStateRef.current = popoverState;
  }, [popoverState]);

  const processedContent = useMemo(() => {
    if (!rationale) {
      return null;
    }

    // If no traceability data, render normally
    if (!traceability || !traceability.highlight_data || traceability.highlight_data.length === 0) {
      return convertMarkupToHtml(rationale);
    }

    // Convert markdown to HTML first
    return convertMarkupToHtml(rationale);
  }, [rationale, traceability]);

  // Handle click outside to close popover
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!popoverState?.visible || !containerRef.current) return;
      
      const target = event.target as HTMLElement;
      if (!target) return;
      
      const popoverElement = document.querySelector('[data-traceability-popover]');
      
      // Don't close if clicking on a reference number (they have their own click handlers)
      if (target.closest('[data-traceability-ref]')) {
        return;
      }
      
      // Don't close if clicking inside the popover
      if (popoverElement?.contains(target)) {
        return;
      }
      
      // Close if clicking outside
      setPopoverState(null);
    };

    if (popoverState?.visible) {
      document.addEventListener('click', handleClickOutside);
      return () => {
        document.removeEventListener('click', handleClickOutside);
      };
    }
  }, [popoverState]);

  // Create a map of reference numbers to chunks (memoized)
  const chunksByReference = useMemo(() => {
    const map = new Map<number, HighlightData[]>();
    if (traceability?.highlight_data) {
      traceability.highlight_data.forEach((chunk) => {
        const refNum = chunk.ref_number;
        if (!map.has(refNum)) {
          map.set(refNum, []);
        }
        map.get(refNum)!.push(chunk);
      });
    }
    return map;
  }, [traceability]);

  // Use event delegation for click handlers (persists across re-renders)
  useEffect(() => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const refElement = target.closest('[data-traceability-ref]') as HTMLElement;
      
      if (!refElement) return;
      
      e.preventDefault();
      e.stopPropagation();
      
      const refNumber = parseInt(refElement.getAttribute('data-ref-number') || '0', 10);
      const chunks = chunksByReference.get(refNumber) || [];
      if (chunks.length === 0) return;
      
      // Always show popover when clicking a reference number
      const rect = refElement.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      let top = rect.bottom + 8;
      let left = rect.left;
      
      if (left + 400 > viewportWidth) {
        left = viewportWidth - 400 - 16;
      }
      if (left < 16) {
        left = 16;
      }
      if (top + 300 > viewportHeight) {
        top = rect.top - 300 - 8;
      }
      
      // Toggle popover - close if same reference is clicked and popover is open, otherwise open
      const currentState = popoverStateRef.current;
      if (currentState?.visible && currentState.refNumber === refNumber) {
        setPopoverState(null);
      } else {
        setPopoverState({
          visible: true,
          refNumber,
          chunks,
          position: { top, left }
        });
      }
    };
    
    container.addEventListener('click', handleClick);
    
    return () => {
      container.removeEventListener('click', handleClick);
    };
  }, [chunksByReference]);

  // Helper function to process and create reference number elements
  const processReferenceNumbers = React.useCallback(() => {
    if (!containerRef.current || !traceability?.highlight_data || !processedContent) return;
    
    const container = containerRef.current;
    
    // Check if we need to process - look for text nodes with [number] pattern
    // that haven't been converted to interactive elements yet
    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_TEXT,
      null
    );
    
    const textNodes: Text[] = [];
    let node;
    while ((node = walker.nextNode())) {
      const text = node.textContent || '';
      // Only process if it contains [number] pattern AND is not already inside a ref element
      if (/\[\d+\]/.test(text)) {
        const parent = node.parentElement;
        // Check if this text node is already inside a processed ref element
        if (parent && !parent.closest('[data-traceability-ref]')) {
          textNodes.push(node as Text);
        }
      }
    }
    
    // Only process if we found unprocessed text nodes
    if (textNodes.length === 0) return;
    
    textNodes.forEach((textNode) => {
      const text = textNode.textContent || '';
      const referencePattern = /\[(\d+)\]/g;
      const matches: Array<{ index: number; length: number; refNumber: number }> = [];
      let match;
      
      while ((match = referencePattern.exec(text)) !== null) {
        matches.push({
          index: match.index,
          length: match[0].length,
          refNumber: parseInt(match[1], 10)
        });
      }
      
      if (matches.length > 0) {
        const parent = textNode.parentElement;
        if (!parent) return;
        
        const fragment = document.createDocumentFragment();
        let lastIndex = 0;
        
        matches.forEach(({ index, length, refNumber }) => {
          // Add text before reference
          if (index > lastIndex) {
            fragment.appendChild(document.createTextNode(text.substring(lastIndex, index)));
          }
          
          // Create interactive reference element
          const chunks = chunksByReference.get(refNumber) || [];
          if (chunks.length > 0) {
            const refSpan = document.createElement('span');
            refSpan.textContent = text.substring(index, index + length);
            refSpan.className = 'inline cursor-pointer text-blue-600 hover:text-blue-800 underline decoration-2 underline-offset-2 transition-colors';
            refSpan.style.display = 'inline';
            refSpan.setAttribute('data-ref-number', refNumber.toString());
            refSpan.setAttribute('data-traceability-ref', 'true');
            
            fragment.appendChild(refSpan);
          } else {
            // No chunks, just add as regular text
            fragment.appendChild(document.createTextNode(text.substring(index, index + length)));
          }
          
          lastIndex = index + length;
        });
        
        // Add remaining text
        if (lastIndex < text.length) {
          fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
        }
        
        parent.replaceChild(fragment, textNode);
      }
    });
  }, [processedContent, traceability, chunksByReference]);

  // Process content and create reference number elements
  // This effect runs whenever processedContent or traceability changes
  useEffect(() => {
    // Use a small delay to ensure React has finished rendering
    const timeoutId = setTimeout(() => {
      processReferenceNumbers();
    }, 0);
    
    return () => {
      clearTimeout(timeoutId);
    };
  }, [processReferenceNumbers]);

  // Also reprocess when popover closes to ensure refs are recreated if DOM was reset
  useEffect(() => {
    if (!popoverState?.visible) {
      // Popover just closed, ensure refs are still interactive
      const timeoutId = setTimeout(() => {
        processReferenceNumbers();
      }, 0);
      
      return () => {
        clearTimeout(timeoutId);
      };
    }
  }, [popoverState?.visible, processReferenceNumbers]);

  // Watch for DOM changes (like heartbeat refreshes that reset dangerouslySetInnerHTML)
  // and recreate reference numbers when needed
  useEffect(() => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    let checkTimeout: NodeJS.Timeout | null = null;
    
    const checkAndReprocess = () => {
      if (!containerRef.current) return;
      
      // Check if reference numbers exist
      const existingRefs = container.querySelectorAll('[data-traceability-ref]');
      const hasTextNodesWithRefs = container.textContent && /\[\d+\]/.test(container.textContent);
      
      // If we have text with [number] pattern but no reference elements, reprocess
      if (hasTextNodesWithRefs && existingRefs.length === 0) {
        processReferenceNumbers();
      }
    };
    
    const observer = new MutationObserver(() => {
      // Debounce the check to avoid excessive processing
      if (checkTimeout) {
        clearTimeout(checkTimeout);
      }
      checkTimeout = setTimeout(() => {
        checkAndReprocess();
      }, 100);
    });
    
    // Observe changes to child nodes and subtree
    observer.observe(container, {
      childList: true,
      subtree: true,
      characterData: true
    });
    
    // Also do an initial check
    checkAndReprocess();
    
    return () => {
      observer.disconnect();
      if (checkTimeout) {
        clearTimeout(checkTimeout);
      }
    };
  }, [processReferenceNumbers]);

  return (
    <>
      <div
        ref={containerRef}
        className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-strong:text-gray-900 prose-ul:text-gray-700"
        dangerouslySetInnerHTML={{ __html: processedContent || '' }}
      />
      {popoverState?.visible && (
        <div
          data-traceability-popover
          className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 p-4 max-w-md max-h-96 overflow-y-auto animate-fade-in"
          style={{
            top: `${popoverState.position.top}px`,
            left: `${popoverState.position.left}px`
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <h5 className="font-semibold text-gray-900 text-sm">
                Reference [{popoverState.refNumber}]
              </h5>
              <span className="text-xs text-gray-500">
                {popoverState.chunks.length} chunk{popoverState.chunks.length > 1 ? 's' : ''}
              </span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setPopoverState(null);
              }}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded hover:bg-gray-100"
              aria-label="Close popover"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {onReferenceClick && (
            <div className="mb-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onReferenceClick(popoverState.refNumber, popoverState.chunks);
                  setPopoverState(null);
                }}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium flex items-center justify-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <span>Open PDF</span>
              </button>
            </div>
          )}

          <div className="space-y-3">
            {popoverState.chunks.map((chunk, index) => (
              <div
                key={`${chunk.chunk_id}-${index}`}
                className="bg-gray-50 rounded-md p-3 border border-gray-100"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-600">
                    Page {chunk.page}
                  </span>
                  <span className="text-xs text-gray-400 font-mono">
                    {chunk.chunk_id}
                  </span>
                </div>
                {chunk.text_preview && (
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {chunk.text_preview}
                  </p>
                )}
                {chunk.text && chunk.text.length > 200 && (
                  <p className="text-xs text-gray-500 mt-1 italic">
                    Full text available ({chunk.text.length} characters)
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
};
