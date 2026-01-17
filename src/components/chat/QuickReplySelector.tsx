import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { MessageSquare, ChevronRight } from 'lucide-react';
import type { QuickReply } from '@/hooks/useQuickReplies';

interface QuickReplySelectorProps {
  replies: QuickReply[];
  searchQuery: string;
  onSelect: (reply: QuickReply) => void;
  onClose: () => void;
  position?: { top: number; left: number };
}

export const QuickReplySelector: React.FC<QuickReplySelectorProps> = ({
  replies,
  searchQuery,
  onSelect,
  onClose,
  position
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Filter replies based on search query
  const filteredReplies = replies.filter(reply => {
    const query = searchQuery.toLowerCase();
    return (
      reply.trigger.toLowerCase().includes(query) ||
      reply.title.toLowerCase().includes(query)
    );
  });

  // Reset selection when filtered results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  // Scroll selected item into view
  useEffect(() => {
    const selectedItem = itemRefs.current[selectedIndex];
    if (selectedItem) {
      selectedItem.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < filteredReplies.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => prev > 0 ? prev - 1 : prev);
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredReplies[selectedIndex]) {
            onSelect(filteredReplies[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
        case 'Tab':
          e.preventDefault();
          if (filteredReplies[selectedIndex]) {
            onSelect(filteredReplies[selectedIndex]);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredReplies, selectedIndex, onSelect, onClose]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  if (filteredReplies.length === 0) {
    return (
      <div
        ref={containerRef}
        className="absolute z-50 w-80 bg-popover border border-border rounded-xl shadow-lg overflow-hidden"
        style={position ? { bottom: position.top, left: position.left } : { bottom: '100%', left: 0 }}
      >
        <div className="p-4 text-sm text-muted-foreground text-center">
          Keine Schnellantworten gefunden für "@{searchQuery}"
        </div>
      </div>
    );
  }

  const previewReply = hoveredId 
    ? filteredReplies.find(r => r.id === hoveredId)
    : filteredReplies[selectedIndex];

  return (
    <div
      ref={containerRef}
      className="absolute z-50 flex bg-popover border border-border rounded-xl shadow-lg overflow-hidden"
      style={position ? { bottom: position.top, left: position.left } : { bottom: '100%', left: 0, marginBottom: '8px' }}
    >
      {/* List of quick replies */}
      <div className="w-64 max-h-64 overflow-y-auto border-r border-border">
        <div className="p-2 border-b border-border bg-muted/50">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Schnellantworten
          </span>
        </div>
        <div className="p-1">
          {filteredReplies.map((reply, index) => (
            <button
              key={reply.id}
              ref={el => itemRefs.current[index] = el}
              onClick={() => onSelect(reply)}
              onMouseEnter={() => {
                setHoveredId(reply.id);
                setSelectedIndex(index);
              }}
              onMouseLeave={() => setHoveredId(null)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors",
                index === selectedIndex
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent text-foreground"
              )}
            >
              <MessageSquare className={cn(
                "w-4 h-4 flex-shrink-0",
                index === selectedIndex ? "text-primary-foreground" : "text-muted-foreground"
              )} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "font-mono text-xs px-1.5 py-0.5 rounded",
                    index === selectedIndex
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}>
                    @{reply.trigger}
                  </span>
                </div>
                <div className={cn(
                  "text-sm truncate mt-0.5",
                  index === selectedIndex ? "text-primary-foreground/80" : "text-foreground"
                )}>
                  {reply.title}
                </div>
              </div>
              <ChevronRight className={cn(
                "w-4 h-4 flex-shrink-0",
                index === selectedIndex ? "text-primary-foreground" : "text-muted-foreground"
              )} />
            </button>
          ))}
        </div>
      </div>

      {/* Preview pane */}
      <div className="w-80 max-h-64 overflow-y-auto bg-muted/30">
        <div className="p-2 border-b border-border bg-muted/50">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Vorschau
          </span>
        </div>
        {previewReply && (
          <div className="p-3">
            <div className="text-xs text-muted-foreground mb-1">
              {previewReply.category || 'Allgemein'}
            </div>
            <div className="text-sm font-medium text-foreground mb-2">
              {previewReply.title}
            </div>
            <div className="text-sm text-muted-foreground whitespace-pre-wrap">
              {previewReply.content}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
