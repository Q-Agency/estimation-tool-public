'use client';

import React, { useState, useRef, useEffect } from 'react';
import { HighlightData } from '@/types';

interface TraceabilityPopoverProps {
  referenceNumber: number;
  chunks: HighlightData[];
  children: React.ReactNode;
}

export const TraceabilityPopover: React.FC<TraceabilityPopoverProps> = ({
  referenceNumber,
  chunks,
  children
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLSpanElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  const updatePosition = () => {
    if (triggerRef.current && popoverRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const popoverRect = popoverRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let top = triggerRect.bottom + 8;
      let left = triggerRect.left;

      // Adjust if popover would go off right edge
      if (left + popoverRect.width > viewportWidth) {
        left = viewportWidth - popoverRect.width - 16;
      }

      // Adjust if popover would go off left edge
      if (left < 16) {
        left = 16;
      }

      // If popover would go off bottom, show above instead
      if (top + popoverRect.height > viewportHeight) {
        top = triggerRect.top - popoverRect.height - 8;
      }

      setPosition({ top, left });
    }
  };

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setIsVisible(true);
      setTimeout(updatePosition, 0);
    }, 300);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setIsVisible(false);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsVisible(!isVisible);
    setTimeout(updatePosition, 0);
  };

  useEffect(() => {
    if (isVisible) {
      updatePosition();
      const handleScroll = () => updatePosition();
      const handleResize = () => updatePosition();
      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', handleResize);
      return () => {
        window.removeEventListener('scroll', handleScroll, true);
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [isVisible]);

  if (!chunks || chunks.length === 0) {
    return <>{children}</>;
  }

  return (
    <span className="relative inline-block">
      <span
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        className="cursor-pointer text-blue-600 hover:text-blue-800 underline decoration-2 underline-offset-2 transition-colors"
        role="button"
        tabIndex={0}
        aria-label={`Reference ${referenceNumber} - ${chunks.length} source chunk${chunks.length > 1 ? 's' : ''}`}
      >
        {children}
      </span>

      {isVisible && (
        <div
          ref={popoverRef}
          className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 p-4 max-w-md max-h-96 overflow-y-auto animate-fade-in"
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`
          }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          role="tooltip"
        >
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200">
            <h5 className="font-semibold text-gray-900 text-sm">
              Reference [{referenceNumber}]
            </h5>
            <span className="text-xs text-gray-500">
              {chunks.length} chunk{chunks.length > 1 ? 's' : ''}
            </span>
          </div>

          <div className="space-y-3">
            {chunks.map((chunk, index) => (
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
    </span>
  );
};

